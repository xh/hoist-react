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
    captureEmptyBaselineHeapAsync,
    detectHeapMethod,
    forceGcAndSettleAsync,
    heapNow,
    measurePerRecordBytesAsync
} from './HeapAttribution';
import {BaselineAdapter} from './BaselineAdapter';
import {CandidateAdapter} from './CandidateAdapter';
import {runProtocolAsync, toTimingStat} from './MeasurementProtocol';
import {
    EnvMetadata,
    HeapAttribution,
    MeasurementProgressFn,
    RunResult,
    ScenarioConfig,
    Scorecard,
    TimingStat
} from './types';

/**
 * One per-iteration measured sample collected inside the protocol loop (performance pass only): the
 * PRIMARY pipeline timing (cube ingest + connected-View re-aggregation, Boundaries 1-4) and the
 * FINAL grid-sync split (Boundary 5). Heap is NOT sampled here - it is a separate one-shot memory
 * pass (see {@link MeasurementHarness.measureMemoryAsync}). The protocol collects these; the harness
 * reduces them into the {@link Scorecard} timings.
 */
interface IterationSample {
    pipeline: PipelineTiming;
    timing: GridSyncTiming;
}

/** The four timing {@link TimingStat}s reduced from the performance pass's measured samples. */
interface TimingStatSplit {
    pipeline: TimingStat;
    compute: TimingStat;
    bridgeCall: TimingStat;
    render: TimingStat;
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
     * Loads exactly `n` rows of the sizing field-shape into the live pipeline (caller supplies
     * the pre-fetched rows behind this). Used by `measurePerRecordBytesAsync` (02-04).
     */
    loadNRowsAsync: (n: number) => Promise<void>;
    /** Tears the sizing rows back down so per-record sizing leaves no residual heap. */
    clearAsync: () => Promise<void>;
    /**
     * Restores the snapshot the harness intentionally cleared to capture the empty-pipeline heap
     * baseline (02-08). The caller already holds the fetched `snapshotRows` and binds this to
     * `() => adapter.loadSnapshotAsync(snapshotRows)`. Called once, AFTER per-record sizing completes
     * and immediately before the measured protocol, so the pipeline is back to its loaded state.
     * Sizing currently shares the measured adapter (its load/clear callbacks target the MAIN
     * pipeline) and leaves it empty, so the reload MUST run after sizing, not before it.
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
    /**
     * Optional coarse-progress sink. The harness calls this as it moves through the memory pass and
     * the performance pass's warmup + measured iterations (the last reporting `current`/`total`), so a
     * caller can surface run status - e.g. a mask message. Has no effect on measurement.
     */
    onProgress?: MeasurementProgressFn;
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
 *     pre-fetched diff batch on demand (plus `loadNRowsAsync`/`clearAsync` for per-record sizing).
 * Inside the protocol loop the harness calls `nextBatchAsync()` and applies the batch via
 * `adapter.applyDiffAsync(batch)`. This keeps the split architecture clean: the core stays endpoint-
 * free, Toolbox owns the fetch (HTTP or WebSocket). It mirrors the 02-04 sizing-callback contract.
 *
 * Extends `HoistModel` so `runner()` (HoistBase) is available for the instrumentation spans, and so the
 * harness participates in the standard `@managed` lifecycle.
 */
export class MeasurementHarness extends HoistModel {
    /**
     * Run a single scenario end-to-end and produce a complete {@link RunResult}.
     *
     * The run is split into two INDEPENDENT, OPTIONAL measurement passes selected by
     * `scenario.measure` (defaults to both; at least one is required or the harness throws):
     *
     *   - MEMORY pass (`measure.memory`): how much heap the loaded dataset retains, attributed by
     *     layer. Order (02-08): clear the live pipeline to TRULY EMPTY -> capture a FIXED clean
     *     post-GC empty-pipeline heap baseline (reference R) -> measure per-record bytes
     *     (median-of-5 over N=50000) -> reload the scenario snapshot (sizing shares + empties the
     *     measured adapter) -> forced GC + settle -> read total heap + counts -> `attributeHeap`.
     *     Ends with the scenario loaded, ready for a following performance pass. Produces `heap`.
     *
     *   - PERFORMANCE pass (`measure.performance`): how fast updates flow at steady state. Runs the
     *     warmup-discard / forced-GC-between / median+p95 protocol; each measured iteration pulls the
     *     next batch via `nextBatchAsync()`, times the REAL cube-ingest + connected-View
     *     re-aggregation pipeline (Boundaries 1-4) via `measurePipeline`, then the FINAL grid-sync
     *     split (Boundary 5) via `measureGridSync`. NO baseline/sizing/heap work - so no 50k
     *     churn. Assumes the scenario is already loaded (by the caller, or by a preceding memory
     *     pass). Produces the timing stats + `overheadMs`.
     *
     * Both: memory first (it ends with the scenario loaded), then performance on that loaded state.
     *
     * Common to both: capture {@link EnvMetadata} up front, and verify the caller pre-loaded the
     * snapshot (`adapter.getResultRowCount() > 0`) so a mis-wired caller fails loudly. The
     * {@link Scorecard} is assembled from whichever passes ran - skipped-pass fields read null
     * (`pipeline`/`compute`/`bridgeCall`/`render` and `overheadMs` for performance; `heap` for
     * memory). `rowCounts` is always present (the scenario is loaded in every path).
     *
     * @returns the complete RunResult for this scenario + adapter.
     */
    async runScenarioAsync(args: RunScenarioArgs): Promise<RunResult> {
        const {
                scenario,
                adapter,
                nextBatchAsync,
                loadNRowsAsync,
                clearAsync,
                reloadSnapshotAsync,
                onProgress
            } = args,
            {protocol} = scenario,
            {memory, performance} = scenario.measure ?? {memory: true, performance: true};

        if (!memory && !performance) {
            throw XH.exception(
                'MeasurementHarness.runScenarioAsync: scenario.measure requests neither the memory ' +
                    'nor the performance pass - at least one must be enabled.'
            );
        }

        // Environment metadata - stamped on every run so saved scorecards compare meaningfully.
        const env = this.captureEnvMetadata();

        // Verify the caller pre-loaded the snapshot (required by both passes).
        if (adapter.getResultRowCount() <= 0) {
            throw XH.exception(
                'MeasurementHarness.runScenarioAsync: adapter is empty. The caller must pre-load ' +
                    'the snapshot via adapter.loadSnapshotAsync(rows) BEFORE running the scenario - ' +
                    'the harness never fetches or loads data itself.'
            );
        }

        // MEMORY pass (runs first so it ends with the scenario loaded for a following perf pass).
        const heap = memory
            ? await this.measureMemoryAsync({
                  adapter,
                  loadNRowsAsync,
                  clearAsync,
                  reloadSnapshotAsync,
                  settleMs: protocol.gcSettleMs,
                  env,
                  onProgress
              })
            : null;

        // PERFORMANCE pass: warmup + measured timing iterations, then the overhead probe.
        let timings: TimingStatSplit | null = null,
            overheadMs: number | null = null;
        if (performance) {
            // A full-replace scenario measures a whole-snapshot reload each iteration
            // (Cube.loadDataAsync, the primary pipeline cost) instead of an incremental diff - see
            // runIterationAsync. This is the harness's one read of an update knob; everything else
            // about the update stream (cadence, batch, breadth) is baked into the caller's batches.
            const fullReplace = scenario.update?.updateMode === 'fullReplace';

            const samples = await runProtocolAsync<IterationSample>({
                protocol,
                setupAsync: async () => {
                    // Scenario is already loaded (caller pre-load, or the preceding memory pass).
                    // Warmup iterations below drive the pipeline into its incremental-transaction
                    // steady state, so we never measure a cold remount full-replace (Pitfall 6).
                },
                runIterationAsync: () =>
                    this.runIterationAsync({
                        adapter,
                        nextBatchAsync,
                        reloadSnapshotAsync,
                        fullReplace
                    }),
                betweenIterationsAsync: () => forceGcAndSettleAsync(protocol.gcSettleMs),
                onProgress
            });

            timings = this.reduceTimings(samples);

            // Bounded/documented instrumentation overhead (HARN-03).
            onProgress?.({stage: 'Finalizing'});
            overheadMs = await measureOverhead(this, protocol.measuredIterations);
        }

        // Assemble the Scorecard from whichever passes ran; skipped-pass fields are null.
        const scorecard: Scorecard = {
            pipeline: timings?.pipeline ?? null,
            compute: timings?.compute ?? null,
            bridgeCall: timings?.bridgeCall ?? null,
            render: timings?.render ?? null,
            heap,
            rowCounts: this.readRowCounts(adapter)
        };

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
     * Measure per-record byte cost for the owned layers using the injected load/clear callbacks.
     * Runs a standard field-shape sizing pass and an object-valued-field variant (02-04 / RESEARCH
     * Open Q1: object fields shared by reference would otherwise be double-counted). The harness
     * applies the measured per-record bytes uniformly to the cube/grid/view owned layers - the
     * caller-supplied `loadNRowsAsync` is responsible for loading representative rows.
     */
    private async measureRecordSizingAsync(args: {
        loadNRowsAsync: (n: number) => Promise<void>;
        clearAsync: () => Promise<void>;
        settleMs: number;
    }): Promise<{cubeRecordBytes: number; gridRecordBytes: number; viewRowBytes: number}> {
        const {loadNRowsAsync, clearAsync, settleMs} = args,
            // Measure once over a representative N; the same per-record figure is applied to each
            // owned layer (cube store record, grid store record, view-result row). N=50000 (10x the
            // default 5000-leaf scenario) makes the sizing load move a tens-of-MB delta that
            // clears the GC/heap noise floor, and median-of-5 rejects a single mistimed GC (02-08).
            sizingN = 50000,
            sizingRepeats = 5,
            perRecordBytes = await measurePerRecordBytesAsync({
                loadNRowsAsync,
                clearAsync,
                n: sizingN,
                repeats: sizingRepeats,
                settleMs
            });

        return {
            cubeRecordBytes: perRecordBytes,
            gridRecordBytes: perRecordBytes,
            viewRowBytes: perRecordBytes
        };
    }

    /**
     * The MEMORY measurement pass (02-08) - a single one-shot heap attribution, fully decoupled from
     * the performance timing loop. Order:
     *   1. Clear the live pipeline to TRULY EMPTY via the baseline's `clearPipelineAsync`
     *      (Cube.clearAsync, pipeline kept alive). A candidate adapter without the true-empty hook
     *      falls back to no clear (documented limitation - the baseline always has it).
     *   2. Capture the FIXED clean post-GC empty-pipeline heap baseline (reference R) - the total
     *      heap is differenced against this so the reported figure is positive retained heap.
     *   3. Measure per-record bytes (median-of-5 over N=50000). This sizing pass SHARES the measured
     *      adapter (its load/clear callbacks target the MAIN pipeline) and leaves it empty.
     *   4. Reload the scenario snapshot (sizing clobbered it), so the heap read reflects the
     *      real loaded scenario - and the adapter is left loaded for a following performance pass.
     *   5. Forced GC + settle, then read counts (02-07 full-hierarchy accessors) and `attributeHeap`.
     *
     * @returns the {@link HeapAttribution} for the loaded scenario.
     */
    private async measureMemoryAsync(args: {
        adapter: CandidateAdapter;
        loadNRowsAsync: (n: number) => Promise<void>;
        clearAsync: () => Promise<void>;
        reloadSnapshotAsync: () => Promise<void>;
        settleMs: number;
        env: EnvMetadata;
        onProgress?: MeasurementProgressFn;
    }): Promise<HeapAttribution> {
        const {
                adapter,
                loadNRowsAsync,
                clearAsync,
                reloadSnapshotAsync,
                settleMs,
                env,
                onProgress
            } = args,
            gridSeam = adapter as Partial<BaselineAdapter>;

        onProgress?.({stage: 'Measuring memory'});

        // 1-2. Truly empty the live pipeline, then capture the FIXED post-GC empty-pipeline baseline.
        await gridSeam.clearPipelineAsync?.();
        const emptyBaselineHeap = await captureEmptyBaselineHeapAsync(settleMs);

        // 3. Measure per-record byte cost per layer (leaves the shared pipeline empty).
        const sizing = await this.measureRecordSizingAsync({loadNRowsAsync, clearAsync, settleMs});

        // 4. Restore the full snapshot AFTER sizing emptied the shared pipeline.
        await reloadSnapshotAsync();

        // 5. Forced GC + settle, then attribute the retained heap by layer. Counts come from the
        //    02-07 full-hierarchy accessors (cube store records, grid store allCount, result rows);
        //    a generic adapter falls back to the result row count.
        await forceGcAndSettleAsync(settleMs);
        const cubeRecordCount = gridSeam.getCubeRecordCount?.() ?? adapter.getResultRowCount(),
            gridRecordCount = gridSeam.getGridRecordCount?.() ?? adapter.getResultRowCount(),
            viewRowCount = adapter.getResultRowCount();

        return attributeHeap({
            emptyBaselineHeap,
            cubeRecordCount,
            gridRecordCount,
            viewRowCount,
            sizing,
            method: env.heapMethod
        });
    }

    /**
     * One measured PERFORMANCE iteration. Two shapes, selected by `fullReplace`:
     *
     * INCREMENTAL (default): pull the next pre-fetched diff batch, then
     *   1. Time the awaited `applyDiffAsync` (cube ingest + connected-View re-aggregation, Boundaries
     *      1-4) via `measurePipeline` as the PRIMARY compute, with a cheap defensive settle hook.
     *   2. Time the grid-sync compute/bridge/render split (Boundary 5) via `measureGridSync`.
     *
     * FULL REPLACE: each iteration re-loads the WHOLE snapshot (`Cube.loadDataAsync`) via the injected
     * `reloadSnapshotAsync`; that reload IS the primary pipeline cost, measured the same way. There is
     * no incremental transaction, so the grid-sync split is not applicable and is reported as zero -
     * the wholesale grid re-render is not captured by the incremental Boundary-5 instrumentation
     * (documented limitation; the headline pipeline cost is the meaningful full-replace number).
     *
     * Heap is NOT sampled here - it is the separate one-shot memory pass ({@link measureMemoryAsync}).
     */
    private async runIterationAsync(args: {
        adapter: CandidateAdapter;
        nextBatchAsync: () => Promise<PlainObject[]>;
        reloadSnapshotAsync: () => Promise<void>;
        fullReplace: boolean;
    }): Promise<IterationSample> {
        const {adapter, nextBatchAsync, reloadSnapshotAsync, fullReplace} = args,
            gridSeam = adapter as Partial<BaselineAdapter>;

        let pipeline: PipelineTiming, timing: GridSyncTiming;
        if (fullReplace) {
            // PRIMARY: the full re-snapshot (Cube.loadDataAsync + connected-View re-aggregation) IS
            // the pipeline cost. No incremental transaction follows, so the grid-sync split is N/A.
            pipeline = await measurePipeline(this, {
                applyDiffAsync: () => reloadSnapshotAsync(),
                settleAsync: () => wait(0),
                rowCount: adapter.getResultRowCount()
            });
            timing = {computeMs: 0, bridgeCallMs: 0, renderMs: 0, renderSuspect: false};
        } else {
            // 1. Pull the next pre-fetched batch from the caller.
            const batch = await nextBatchAsync();

            // 2. PRIMARY: time the awaited cube-ingest + connected-View re-aggregation pipeline. The
            //    source confirms the await already settles the View; the settle hook is a cheap
            //    defensive flush (one macrotask) so any trailing reaction is captured, not dropped.
            pipeline = await measurePipeline(this, {
                applyDiffAsync: () => adapter.applyDiffAsync(batch),
                settleAsync: () => wait(0),
                rowCount: adapter.getResultRowCount()
            });

            // 3. FINAL stage - Boundary-5 compute/bridge/render split via the injected grid-sync
            //    callables. The baseline adapter exposes genTransaction/applyTransaction; a candidate
            //    adapter must expose equivalents.
            timing = await measureGridSync(this, {
                genTransaction: gridSeam.genTransaction ?? (() => ({})),
                applyTransaction: gridSeam.applyTransaction ?? (() => undefined),
                rowCount: adapter.getResultRowCount()
            });
        }

        return {pipeline, timing};
    }

    /** Reduce the per-iteration performance samples into the four timing {@link TimingStat}s. */
    private reduceTimings(samples: IterationSample[]): TimingStatSplit {
        return {
            pipeline: toTimingStat(samples.map(s => s.pipeline.totalMs)),
            compute: toTimingStat(samples.map(s => s.timing.computeMs)),
            bridgeCall: toTimingStat(samples.map(s => s.timing.bridgeCallMs)),
            render: toTimingStat(samples.map(s => s.timing.renderMs))
        };
    }

    /** Read the loaded scenario's row counts from the adapter (present in every run path). */
    private readRowCounts(adapter: CandidateAdapter): Scorecard['rowCounts'] {
        const gridSeam = adapter as Partial<BaselineAdapter>;
        return {
            leaf: gridSeam.getCubeRecordCount?.() ?? adapter.getResultRowCount(),
            aggregate: adapter.getResultRowCount(),
            gridRows: gridSeam.getGridRecordCount?.() ?? adapter.getResultRowCount()
        };
    }
}
