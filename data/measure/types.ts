/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Serializable type schema for the framework-resident measurement core.
 *
 * Per the locked Phase-2 decisions, the harness is config-driven - "work the knobs first," and
 * "profiles and update patterns are data, not code." Every type here is plain serializable JSON
 * (no class instances) so a `ScenarioConfig` round-trips through `ViewManager` JsonBlob storage as
 * a named/shared profile, and a `RunResult` persists for later side-by-side comparison.
 *
 * The invariant ingest contract (Phase-1 TRANSPORT-INVENTORY): every delivery transport collapses
 * to exactly two client ingest operations - a full snapshot to `Cube.loadDataAsync` and an
 * incremental diff to `Cube.updateDataAsync`. The `transport` knob therefore varies only the
 * delivery adapter; the measured pipeline behind those two entry points is held constant.
 */

//------------------------------------------------------------------------------------------------
// Dataset-shape knobs (HARN-01)
//------------------------------------------------------------------------------------------------

/**
 * Weighted distribution of field value types across the generated dataset. Weights are relative
 * (need not sum to 1) - the generator normalizes them. Object-valued fields probe the Phase-1
 * heap question (shared-by-reference object fields and their attribution cost).
 */
export interface FieldTypeMix {
    number: number;
    string: number;
    date: number;
    /** Object-valued fields - the Phase-1 heap probe (shared-reference behavior). */
    object: number;
}

/**
 * Dataset-shape knobs (HARN-01). Shape is driven through the Cube so aggregate rows are real:
 * many leaves under few/coarse dimensions yields the large-leaf-plus-aggregate shape.
 */
export interface DatasetShapeConfig {
    /** Leaf records loaded to the Cube's internal store. */
    leafRowCount: number;
    /**
     * Cube grouping dimensions. Drives the aggregate-row count via the cardinality of the
     * dimension cross-product - large-leaf-plus-aggregate shapes come from many leaves under
     * few/coarse dimensions.
     */
    dimensions: string[];
    /** Number of fields per record. */
    fieldCount: number;
    /** Type distribution of the generated fields. */
    fieldTypeMix: FieldTypeMix;
    /**
     * Aggregated fields the View computes (e.g. SUM/AVG). Affects ViewResult size and
     * `dataOnlyUpdate` fast-path eligibility.
     */
    aggregators: string[];
    /** RNG seed for deterministic, reproducible generation. */
    seed: number;
}

//------------------------------------------------------------------------------------------------
// Update knobs (HARN-02)
//------------------------------------------------------------------------------------------------

/**
 * Update pattern. Determines snapshot vs diff ingest and whether the View takes the `fullUpdate`
 * vs `dataOnlyUpdate` path:
 * - `steadyTrickle`   - small, continuous diffs (targeted `updateDataAsync`).
 * - `periodicBurst`   - intermittent large diff batches.
 * - `broadReplace`    - full re-snapshot/replace (`loadDataAsync`).
 * - `targetedNarrow`  - few records, few fields each (narrow `dataOnlyUpdate`-eligible diffs).
 */
export type UpdatePattern = 'steadyTrickle' | 'periodicBurst' | 'broadReplace' | 'targetedNarrow';

/**
 * Change-delivery transport. Only the delivery adapter changes between these - both resolve to the
 * invariant two-op ingest contract (`Cube.loadDataAsync` / `updateDataAsync`). WebSocket push is a
 * first-class Data 2.0 transport.
 */
export type Transport = 'http' | 'webSocket';

/** Update knobs (HARN-02): pattern, breadth, throughput, transport, and stream duration. */
export interface UpdateConfig {
    pattern: UpdatePattern;
    /** Fields changed per updated record (narrow vs wide). */
    breadth: number;
    /** Records per update batch. */
    batchSize: number;
    /** Update batches delivered per second (throughput). */
    ratePerSec: number;
    /** Delivery transport - only the adapter changes; ingest contract is invariant. */
    transport: Transport;
    /** How long the update stream runs for a single measured iteration. */
    durationSec: number;
}

//------------------------------------------------------------------------------------------------
// Protocol knobs (HARN-05)
//------------------------------------------------------------------------------------------------

/**
 * Measurement-protocol knobs (HARN-05): warmup discards, measured iterations, and the forced-GC
 * settle. Counts are Claude's-discretion defaults (see {@link DEFAULT_PROTOCOL}) and are persisted
 * with every run for reproducibility.
 */
export interface ProtocolConfig {
    /** Iterations run and discarded before measurement (JIT warmup, lazy alloc, caches fill). */
    warmupIterations: number;
    /** Iterations measured and reported (median + p95 computed over these samples). */
    measuredIterations: number;
    /** Settle delay after `window.gc()` before reading heap, in ms (GC is best-effort/async). */
    gcSettleMs: number;
}

/**
 * Sane default protocol. Claude's-discretion counts - tuned so p95 stabilizes - persisted with
 * each run so a saved scorecard records exactly how it was measured.
 */
export const DEFAULT_PROTOCOL: ProtocolConfig = {
    warmupIterations: 5,
    measuredIterations: 20,
    gcSettleMs: 50
};

//------------------------------------------------------------------------------------------------
// Top-level scenario config
//------------------------------------------------------------------------------------------------

/**
 * A complete, serializable scenario definition - the single config object the harness consumes.
 * Persisted as a named JsonBlob profile via `ViewManager` ("profiles are data, not code").
 */
export interface ScenarioConfig {
    name: string;
    dataset: DatasetShapeConfig;
    update: UpdateConfig;
    protocol: ProtocolConfig;
    notes?: string;
}

//------------------------------------------------------------------------------------------------
// Output types (HARN-04 / HARN-05)
//------------------------------------------------------------------------------------------------

/** A single timing measurement summarized over measured iterations. All values in milliseconds. */
export interface TimingStat {
    medianMs: number;
    p95Ms: number;
    /** Raw per-iteration samples (sorted or unsorted) the median/p95 were computed from. */
    samples: number[];
}

/**
 * Heap-attribution method recorded with each run (HARN-04). The no-cross-origin-isolation default
 * is `performanceMemory` (owned-object accounting + whole-heap `performance.memory` deltas); the
 * optional COI path is `measureUserAgentSpecificMemory` (deferred unless trivial).
 */
export type HeapMethod = 'performanceMemory' | 'measureUserAgentSpecificMemory';

/**
 * Heap attributed by layer (HARN-04), all in bytes. Owned layers come from counts x calibrated
 * per-record cost; `agGridInternals` is the opaque remainder (total heap delta minus owned
 * layers) and is never read from AG Grid source - AG Grid memory is opaque/library-owned.
 */
export interface HeapAttribution {
    cubeStoreRecords: number;
    gridStoreRecords: number;
    viewResultRows: number;
    /** Opaque remainder: total delta minus the owned layers. Never read from AG Grid source. */
    agGridInternals: number;
    totalHeapDelta: number;
    unit: 'bytes';
    method: HeapMethod;
}

/**
 * The full per-run scorecard (HARN-04 / HARN-05).
 *
 * Stage ordering (read the timing fields in this order):
 *   1. `pipeline`   - PRIMARY compute: cube ingest + connected-View re-aggregation (Boundaries 1-4),
 *                     timed around the awaited `applyDiffAsync`. This is the real engine work.
 *   2. `compute`    - FINAL grid-sync stage, Hoist-side: `genTransaction` building the AG Grid txn.
 *   3. `bridgeCall` - FINAL grid-sync stage, the synchronous JS-to-AG-Grid crossing (`applyTransaction`).
 *   4. `render`     - FINAL grid-sync stage, the deferred layout/paint landing in a later frame.
 *
 * `pipeline` is the headline compute number; `compute`/`bridgeCall`/`render` are the Boundary-5
 * grid-sync split that follows it (the cost of diffing + applying the re-aggregated rows to AG Grid).
 */
export interface Scorecard {
    /**
     * PRIMARY compute: cube ingest + connected-View re-aggregation (Boundaries 1-4), timed around
     * the awaited `applyDiffAsync`. The headline engine cost; grid-sync below is the final stage.
     */
    pipeline: TimingStat;
    /** FINAL grid-sync stage: Hoist-side compute (genTransaction), timed directly in JS. */
    compute: TimingStat;
    /** FINAL grid-sync stage: synchronous JS-to-AG-Grid bridge call (applyTransaction), timed directly. */
    bridgeCall: TimingStat;
    /** FINAL grid-sync stage: deferred render/paint after the bridge call (captured via animation frame). */
    render: TimingStat;
    heap: HeapAttribution;
    rowCounts: {
        leaf: number;
        aggregate: number;
        gridRows: number;
    };
    /** Measured grid transactions applied per burst (Phase-1 MobX-coalescing question). */
    transactionsPerBurst?: number;
}

/** Environment metadata stamped on every run so saved scorecards compare meaningfully. */
export interface EnvMetadata {
    userAgent: string;
    /** Gates the COI heap path and 5us `performance.now()` resolution. */
    crossOriginIsolated: boolean;
    /** Whether `window.gc()` is available (Chrome `--js-flags=--expose-gc`). */
    exposeGc: boolean;
    /** Whether `--enable-precise-memory-info` appears active (un-quantized heap readings). */
    preciseMemory: boolean;
    /** Heap method actually used for this run. */
    heapMethod: HeapMethod;
    /** ISO-8601 timestamp of capture. */
    capturedAt: string;
}

/** A single complete measured run: the input scenario plus its scorecard, env, and overhead. */
export interface RunResult {
    scenario: ScenarioConfig;
    scorecard: Scorecard;
    env: EnvMetadata;
    /** Identifies which implementation produced this result (see {@link CandidateAdapter.id}). */
    adapterId: string;
    /**
     * Null-scenario instrumentation overhead, in ms - the harness's own measured cost on an empty
     * iteration (HARN-03 "bounded, documented overhead"). Subtract or report alongside results.
     */
    overheadMs: number;
}
