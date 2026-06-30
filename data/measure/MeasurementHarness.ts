/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, PlainObject, XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {
    measureGridSync,
    measureOverhead,
    measurePipeline,
    GridSyncTiming,
    PipelineTiming
} from './BoundaryInstrumentation';
import {
    attributeHeap,
    calibratePerRecordBytesAsync,
    captureEmptyBaselineHeapAsync,
    detectHeapMethod,
    forceGcAndSettleAsync,
    heapNow
} from './HeapAttribution';
import {BaselineAdapter} from './BaselineAdapter';
import {CandidateAdapter} from './CandidateAdapter';
import {runProtocolAsync, toTimingStat} from './MeasurementProtocol';
import {EnvMetadata, HeapAttribution, RunResult, ScenarioConfig, Scorecard} from './types';

/**
 * One per-iteration measured sample collected inside the protocol loop: the PRIMARY pipeline timing
 * (cube ingest + connected-View re-aggregation, Boundaries 1-4), the FINAL grid-sync split
 * (Boundary 5), and a steady-state heap snapshot. The protocol collects these; the harness reduces
 * them into the {@link Scorecard}.
 */
interface IterationSample {
    pipeline: PipelineTiming;
    timing: GridSyncTiming;
    heap: HeapAttribution;
}

/**
 * Per-iteration data-provider callbacks the CALLER injects so the harness stays transport- and
 * endpoint-agnostic (see {@link MeasurementHarness} class doc for the full rationale).
 */
export interface HarnessDataProvider {
    /**
     * Returns the next pre-fetched diff batch to apply this iteration. The caller (Toolbox) owns the
     * fetch - over HTTP or WebSocket - and hands back a plain row array; the harness never knows the
     * endpoint. Must resolve with the batch (may be empty for a no-op iteration).
     */
    nextBatchAsync: () => Promise<PlainObject[]>;
    /**
     * Loads exactly `n` rows of the calibration field-shape into the live pipeline (caller supplies
     * the pre-fetched rows behind this). Used by `calibratePerRecordBytesAsync` (02-04).
     */
    loadNRowsAsync: (n: number) => Promise<void>;
    /** Tears the calibration rows back down so calibration leaves no residual heap. */
    clearAsync: () => Promise<void>;
    /**
     * Restores the snapshot the harness intentionally cleared to capture the empty-pipeline heap
     * baseline (02-08). The caller already holds the fetched `snapshotRows` and binds this to
     * `() => adapter.loadSnapshotAsync(snapshotRows)`. Called once, AFTER calibration completes and
     * immediately before the measured protocol, so the pipeline is back to its loaded state.
     * Calibration currently shares the measured adapter (its load/clear callbacks target the MAIN
     * pipeline) and leaves it empty, so the reload MUST run after calibration, not before it.
     */
    reloadSnapshotAsync: () => Promise<void>;
}

/** Args for {@link MeasurementHarness.runScenarioAsync}. */
export interface RunScenarioArgs extends HarnessDataProvider {
    /** The serializable scenario definition (dataset/update/protocol knobs). */
    scenario: ScenarioConfig;
    /**
     * Any pre-loaded {@link CandidateAdapter} - the BASELINE ({@link BaselineAdapter}) or a candidate
     * engine. The caller MUST have already loaded the initial snapshot via
     * `adapter.loadSnapshotAsync(rows)` before handing the adapter to the harness.
     */
    adapter: CandidateAdapter;
}

/**
 * The measurement orchestrator (HARN-05 / HARN-06) - the durable, reusable engine that assembles the
 * config/result types (02-01), boundary instrumentation (02-03), and heap attribution (02-04) into a
 * single run that takes a {@link ScenarioConfig} + a pre-loaded {@link CandidateAdapter} and returns a
 * complete {@link RunResult}.
 *
 * REUSABLE FOR BASELINE AND CANDIDATE (HARN-06): the harness never hardcodes the baseline - it drives
 * whatever `CandidateAdapter` it is handed through the IDENTICAL protocol. Pass a {@link BaselineAdapter}
 * to measure today's pipeline; pass a candidate engine's adapter (Phase 6/7) to measure it apples-to-
 * apples. One engine, one protocol, comparable RunResults.
 *
 * TRANSPORT/ENDPOINT-AGNOSTIC BY DESIGN (the integration seam 02-06 wires to): the harness lives in
 * hoist-react and has ZERO knowledge of any endpoint, URL, or fetch/WebSocket service. It NEVER fetches
 * data. Instead the CALLER owns all transport:
 *   - the caller PRE-FETCHES the initial snapshot and PRE-LOADS it into the adapter via
 *     `adapter.loadSnapshotAsync(rows)` BEFORE handing the adapter to the harness, and
 *   - the caller supplies an injected `nextBatchAsync()` data-provider callback that returns the next
 *     pre-fetched diff batch on demand (plus `loadNRowsAsync`/`clearAsync` for heap calibration).
 * Inside the protocol loop the harness calls `nextBatchAsync()` and applies the batch via
 * `adapter.applyDiffAsync(batch)`. This keeps the split architecture clean: the core stays endpoint-
 * free, Toolbox owns the fetch (HTTP or WebSocket). It mirrors the 02-04 calibration-callback contract.
 *
 * Extends `HoistModel` so `runner()` (HoistBase) is available for the instrumentation spans, and so the
 * harness participates in the standard `@managed` lifecycle.
 */
export class MeasurementHarness extends HoistModel {
    /**
     * Run a single scenario end-to-end and produce a complete {@link RunResult}.
     *
     * Steps:
     *   1. Capture {@link EnvMetadata} up front (userAgent, crossOriginIsolated, gc/precise-memory
     *      heuristics, heap method, timestamp).
     *   2. Verify the caller pre-loaded the snapshot (`adapter.getResultRowCount() > 0`) - throws a
     *      clear error if the adapter is empty so a mis-wired caller fails loudly.
     *   2b. EMPTY-BASELINE FIRST (02-08): clear the live pipeline to TRULY EMPTY via the baseline's
     *      `clearPipelineAsync` (Cube.clearAsync, pipeline kept alive), then capture a FIXED clean
     *      post-GC empty-pipeline heap baseline (`captureEmptyBaselineHeapAsync`). Every iteration's
     *      total heap is differenced against this fixed baseline, so the reported total is positive
     *      retained heap (not the old inverted within-iteration pre/post-GC delta). Next calibrate
     *      per-record bytes via `calibratePerRecordBytesAsync` (median-of-5 over N=50000, 02-08) using
     *      the injected `loadNRowsAsync`/`clearAsync` callbacks. Calibration currently SHARES the
     *      measured adapter and leaves the pipeline empty, so ONLY THEN RELOAD the snapshot via the
     *      injected `reloadSnapshotAsync`. Resulting order: clear -> capture empty baseline -> calibrate
     *      -> reload snapshot -> run protocol.
     *   3. Run the warmup-discard / forced-GC-between / median+p95 protocol (02-05 Task 1). Each
     *      measured iteration pulls the next batch via the injected `nextBatchAsync()`, then times the
     *      REAL cube-ingest + connected-View re-aggregation pipeline (Boundaries 1-4) as the PRIMARY
     *      compute by wrapping the awaited `adapter.applyDiffAsync` in `measurePipeline` (02-03/02-07);
     *      then times the FINAL grid-sync stage (Boundary 5) via `measureGridSync` (02-03); then
     *      settles + `attributeHeap` (02-04) for the steady-state heap sample.
     *   4. Reduce samples into a {@link Scorecard}: `pipeline` as the primary compute `TimingStat`,
     *      compute/bridgeCall/render as the grid-sync `TimingStat` split (median + p95); heap as the
     *      final steady-state attribution; row counts from the adapter.
     *   5. Measure instrumentation overhead via `measureOverhead` (02-03) for `RunResult.overheadMs`.
     *
     * @returns the complete RunResult for this scenario + adapter.
     */
    async runScenarioAsync(args: RunScenarioArgs): Promise<RunResult> {
        const {scenario, adapter, nextBatchAsync, loadNRowsAsync, clearAsync, reloadSnapshotAsync} =
                args,
            {protocol} = scenario;

        // 1. Environment metadata - stamped on every run so saved scorecards compare meaningfully.
        const env = this.captureEnvMetadata();

        // 2. Verify the caller pre-loaded the snapshot.
        if (adapter.getResultRowCount() <= 0) {
            throw XH.exception(
                'MeasurementHarness.runScenarioAsync: adapter is empty. The caller must pre-load ' +
                    'the snapshot via adapter.loadSnapshotAsync(rows) BEFORE running the scenario - ' +
                    'the harness never fetches or loads data itself.'
            );
        }

        // 2b. EMPTY-BASELINE FIRST (02-08): truly empty the live pipeline (cube.clearAsync, pipeline
        //     kept alive), then capture the FIXED clean post-GC empty-pipeline heap baseline. The
        //     snapshot reload is intentionally deferred until AFTER calibration (see below). A candidate
        //     adapter without the true-empty hook falls back to no clear (documented limitation - the
        //     baseline always has it).
        const gridSeam = adapter as Partial<BaselineAdapter>;
        await gridSeam.clearPipelineAsync?.();
        const emptyBaselineHeap = await captureEmptyBaselineHeapAsync(protocol.gcSettleMs);

        // Calibrate per-record byte cost per layer (median-of-5 over N=50000, 02-08). Calibration
        // currently SHARES the measured adapter (the caller's loadNRowsAsync/clearAsync load and
        // true-empty the MAIN pipeline), so it leaves the pipeline empty and clobbers any earlier
        // snapshot load. The snapshot is therefore reloaded AFTER calibration, immediately below.
        const calibration = await this.calibrateAsync({
            loadNRowsAsync,
            clearAsync,
            settleMs: protocol.gcSettleMs
        });

        // Restore the full snapshot AFTER calibration (which left the shared pipeline empty), so the
        // measured protocol runs against the real loaded scenario - not the ~empty residue.
        await reloadSnapshotAsync();

        // 3. Run the steady-state protocol, collecting one IterationSample per measured iteration.
        const samples = await runProtocolAsync<IterationSample>({
            protocol,
            setupAsync: async () => {
                // Snapshot is pre-loaded by the caller (verified above). Warmup iterations below
                // then drive the pipeline into its incremental-transaction steady state, so we never
                // measure a cold remount full-replace (Pitfall 6).
            },
            runIterationAsync: () =>
                this.runIterationAsync({
                    adapter,
                    nextBatchAsync,
                    calibration,
                    env,
                    emptyBaselineHeap
                }),
            betweenIterationsAsync: () => forceGcAndSettleAsync(protocol.gcSettleMs)
        });

        // 4. Reduce the per-iteration samples into the Scorecard.
        const scorecard = this.reduceScorecard(samples, adapter);

        // 5. Bounded/documented instrumentation overhead (HARN-03).
        const overheadMs = await measureOverhead(this, protocol.measuredIterations);

        return {scenario, scorecard, env, adapterId: adapter.id, overheadMs};
    }

    //--------------------------------------------------------------------------------------------
    // Implementation
    //--------------------------------------------------------------------------------------------

    /** Capture environment metadata up front (RESEARCH "Detecting environment for run metadata"). */
    private captureEnvMetadata(): EnvMetadata {
        const exposeGc = typeof window['gc'] === 'function',
            // No direct API for the precise-memory flag; heuristic - precise readings are non-100KB
            // multiples. We can only positively detect coarse quantization, so report exposeGc-gated
            // best guess: treat precise as available only when a heap read is non-null AND not an
            // exact 100KB multiple (un-quantized). Conservative: false when heap is unavailable.
            heap = heapNow(),
            preciseMemory = heap != null && heap % 100000 !== 0;

        return {
            userAgent: window.navigator.userAgent,
            crossOriginIsolated: window.crossOriginIsolated === true,
            exposeGc,
            preciseMemory,
            heapMethod: detectHeapMethod(),
            capturedAt: new Date().toISOString()
        };
    }

    /**
     * Calibrate per-record byte cost for the owned layers using the injected load/clear callbacks.
     * Runs a standard field-shape calibration and an object-valued-field variant (02-04 / RESEARCH
     * Open Q1: object fields shared by reference would otherwise be double-counted). The harness
     * applies the calibrated per-record bytes uniformly to the cube/grid/view owned layers - the
     * caller-supplied `loadNRowsAsync` is responsible for loading representative rows.
     */
    private async calibrateAsync(args: {
        loadNRowsAsync: (n: number) => Promise<void>;
        clearAsync: () => Promise<void>;
        settleMs: number;
    }): Promise<{cubeRecordBytes: number; gridRecordBytes: number; viewRowBytes: number}> {
        const {loadNRowsAsync, clearAsync, settleMs} = args,
            // Calibrate once over a representative N; the same per-record figure is applied to each
            // owned layer (cube store record, grid store record, view-result row). N=50000 (10x the
            // default 5000-leaf scenario) makes the calibration load move a tens-of-MB delta that
            // clears the GC/heap noise floor, and median-of-5 rejects a single mistimed GC (02-08).
            calN = 50000,
            calRepeats = 5,
            perRecordBytes = await calibratePerRecordBytesAsync({
                loadNRowsAsync,
                clearAsync,
                n: calN,
                repeats: calRepeats,
                settleMs
            });

        return {
            cubeRecordBytes: perRecordBytes,
            gridRecordBytes: perRecordBytes,
            viewRowBytes: perRecordBytes
        };
    }

    /**
     * One measured iteration. Stage order matters: time the PRIMARY pipeline first (it produces the
     * new `View.result` + grid store records), then the FINAL grid-sync stage (it diffs and applies
     * those records to AG Grid), then settle + attribute the heap.
     *   1. Pull the next pre-fetched diff batch from the injected provider (the harness fetches nothing).
     *   2. Time the awaited `applyDiffAsync` (cube ingest + connected-View re-aggregation, Boundaries
     *      1-4) via `measurePipeline` as the PRIMARY compute, with a cheap defensive settle hook.
     *   3. Time the grid-sync compute/bridge/render split (Boundary 5) via `measureGridSync`.
     *   4. Settle + `attributeHeap`, differencing the post-GC heap against the FIXED empty-pipeline
     *      baseline captured up front (02-08), for the steady-state heap sample.
     */
    private async runIterationAsync(args: {
        adapter: CandidateAdapter;
        nextBatchAsync: () => Promise<PlainObject[]>;
        calibration: {cubeRecordBytes: number; gridRecordBytes: number; viewRowBytes: number};
        env: EnvMetadata;
        emptyBaselineHeap: number;
    }): Promise<IterationSample> {
        const {adapter, nextBatchAsync, calibration, env, emptyBaselineHeap} = args,
            gridSeam = adapter as Partial<BaselineAdapter>;

        // 1. Pull the next pre-fetched batch from the caller.
        const batch = await nextBatchAsync();

        // 2. PRIMARY: time the awaited cube-ingest + connected-View re-aggregation pipeline. The
        //    source confirms the await already settles the View; the settle hook is a cheap
        //    defensive flush (one macrotask) so any trailing reaction is captured, not dropped.
        const pipeline = await measurePipeline(this, {
            applyDiffAsync: () => adapter.applyDiffAsync(batch),
            settleAsync: () => wait(0),
            rowCount: adapter.getResultRowCount()
        });

        // 3. FINAL stage - Boundary-5 compute/bridge/render split via the injected grid-sync
        //    callables. The baseline adapter exposes genTransaction/applyTransaction; a candidate
        //    adapter must expose equivalents.
        const timing = await measureGridSync(this, {
            genTransaction: gridSeam.genTransaction ?? (() => ({})),
            applyTransaction: gridSeam.applyTransaction ?? (() => undefined),
            rowCount: adapter.getResultRowCount()
        });

        // 4. Steady-state heap sample: settle, then pure attribute. The total is differenced against
        //    the FIXED empty-pipeline baseline captured up front (02-08), NOT a within-iteration
        //    pre-GC read. Counts come from the 02-07 full-hierarchy accessors (cube store records,
        //    grid store allCount, result rows); a generic adapter falls back to the result row count.
        const cubeRecordCount = gridSeam.getCubeRecordCount?.() ?? adapter.getResultRowCount(),
            gridRecordCount = gridSeam.getGridRecordCount?.() ?? adapter.getResultRowCount(),
            viewRowCount = adapter.getResultRowCount();

        await forceGcAndSettleAsync(0);
        const heap = attributeHeap({
            emptyBaselineHeap,
            cubeRecordCount,
            gridRecordCount,
            viewRowCount,
            calibration,
            method: env.heapMethod
        });

        return {pipeline, timing, heap};
    }

    /** Reduce the per-iteration samples into the final {@link Scorecard} (median + p95 timing). */
    private reduceScorecard(samples: IterationSample[], adapter: CandidateAdapter): Scorecard {
        const pipeline = toTimingStat(samples.map(s => s.pipeline.totalMs)),
            compute = toTimingStat(samples.map(s => s.timing.computeMs)),
            bridgeCall = toTimingStat(samples.map(s => s.timing.bridgeCallMs)),
            render = toTimingStat(samples.map(s => s.timing.renderMs)),
            // Heap is reported as the final steady-state attribution (the last measured iteration).
            heap = samples.length ? samples[samples.length - 1].heap : this.emptyHeap(),
            gridSeam = adapter as Partial<BaselineAdapter>,
            leaf = gridSeam.getCubeRecordCount?.() ?? adapter.getResultRowCount(),
            gridRows = gridSeam.getGridRecordCount?.() ?? adapter.getResultRowCount();

        return {
            pipeline,
            compute,
            bridgeCall,
            render,
            heap,
            rowCounts: {
                leaf,
                aggregate: adapter.getResultRowCount(),
                gridRows
            }
        };
    }

    private emptyHeap(): HeapAttribution {
        return {
            cubeStoreRecords: 0,
            gridStoreRecords: 0,
            viewResultRows: 0,
            agGridInternals: 0,
            totalHeapDelta: 0,
            unit: 'bytes',
            method: detectHeapMethod()
        };
    }
}
