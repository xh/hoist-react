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
 * "profiles and scenarios are data, not code." Every type here is plain serializable JSON
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
 * Temporal shape of the update stream over time - ORTHOGONAL to batch magnitude (`batchSize`):
 * - `steady` - every tick changes `batchSize` rows at a constant rate.
 * - `burst`  - load is concentrated: every 5th tick spikes to ~10x `batchSize`, the ticks between
 *              run a light trough. `batchSize` is the baseline it scales around. Stresses jank under
 *              spikes. Applies only to incremental updates (a `fullReplace` is whole-dataset each tick).
 */
export type UpdateCadence = 'steady' | 'burst';

/**
 * What each update delivers - ORTHOGONAL to cadence and magnitude:
 * - `incremental` - a per-row diff applied via `Cube.updateDataAsync`; shaped by `batchSize`/`breadth`.
 * - `fullReplace` - a full re-snapshot applied via `Cube.loadDataAsync` each tick. `batchSize`,
 *                   `breadth`, and `cadence` do not apply (every tick reloads the whole dataset).
 */
export type UpdateMode = 'incremental' | 'fullReplace';

/**
 * Change-delivery transport. Only the delivery adapter changes between these - both resolve to the
 * invariant two-op ingest contract (`Cube.loadDataAsync` / `updateDataAsync`). WebSocket push is a
 * first-class Data 2.0 transport.
 */
export type Transport = 'http' | 'webSocket';

/** Update knobs (HARN-02): cadence, delivery mode, breadth, throughput, transport, and duration. */
export interface UpdateConfig {
    /** Temporal shape of the stream over time (steady vs bursty). Orthogonal to `batchSize`. */
    cadence: UpdateCadence;
    /** Whether each update is an incremental diff or a full re-snapshot. */
    updateMode: UpdateMode;
    /** Fields changed per updated record (narrow vs wide). Ignored when `updateMode` is `fullReplace`. */
    breadth: number;
    /** Records changed per tick; the baseline a `burst` cadence scales. Ignored when `fullReplace`. */
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

/**
 * Coarse progress update emitted by the harness during a run so a caller can surface run status
 * (e.g. drive a mask message). One-shot stages omit `current`/`total`; iterating stages report a
 * 1-based `current` of `total`.
 */
export interface MeasurementProgress {
    /** Coarse phase label, e.g. 'Measuring memory', 'Warming up', 'Measuring performance'. */
    stage: string;
    /** 1-based index within an iterating stage. */
    current?: number;
    /** Total count for an iterating stage. */
    total?: number;
}

/** Optional progress sink the caller passes to the harness to receive {@link MeasurementProgress}. */
export type MeasurementProgressFn = (progress: MeasurementProgress) => void;

//------------------------------------------------------------------------------------------------
// Measurement-pass selection
//------------------------------------------------------------------------------------------------

/**
 * Selects which of the two independent, optional measurement passes a run performs. The two
 * concerns are fully decoupled:
 *  - `memory`      - how much heap the loaded dataset retains, attributed by layer (empty-baseline
 *                    capture + per-record sizing + post-GC heap read). NO timing work.
 *  - `performance` - how fast updates flow (warmup + measured pipeline/grid-sync iterations, median
 *                    + p95, overhead probe). NO baseline/sizing/heap work, so no 50k churn.
 *
 * At least one must be true (the harness throws otherwise). Both default to true.
 */
export interface MeasureConfig {
    memory: boolean;
    performance: boolean;
}

//------------------------------------------------------------------------------------------------
// Grid configuration
//------------------------------------------------------------------------------------------------

/**
 * Grid-engine switches the scenario drives onto the measured `GridModel` - the toggles that
 * materially change how the grid renders large data and must be honored for a representative
 * measurement. Grows as more grid knobs are exposed.
 */
export interface GridScenarioConfig {
    /**
     * Reuse a limited set of column DOM elements for the columns visible in the scroll area, rather
     * than rendering every column (maps to `GridModel.useVirtualColumns`). Essential for wide column
     * sets - without it the grid easily crashes trying to render them all. Defaults to true.
     */
    useVirtualColumns: boolean;
}

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
    /** Which measurement passes to run (memory / performance). Defaults to both when omitted. */
    measure: MeasureConfig;
    /** Grid-engine switches driven onto the measured `GridModel`. */
    grid: GridScenarioConfig;
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
 * Heap attributed by layer (HARN-04), all in bytes. Owned layers come from counts x measured
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
 *   1. `engine`     - PRIMARY data-layer cost: cube ingest + connected-View re-aggregation
 *                     (Boundaries 1-4), timed around the awaited `applyDiffAsync`. The real engine work.
 *   2. `genTxn`     - FINAL grid-sync stage, Hoist-side: `genTransaction` building the AG Grid txn.
 *   3. `bridgeCall` - FINAL grid-sync stage, the synchronous JS-to-AG-Grid crossing (`applyTransaction`).
 *   4. `render`     - FINAL grid-sync stage, the deferred layout/paint landing in a later frame.
 *
 * `engine` is the headline data-layer number; `genTxn`/`bridgeCall`/`render` are the Boundary-5
 * grid-sync split that follows it (the cost of diffing + applying the re-aggregated rows to AG Grid).
 *
 * The timing fields and `heap` are nullable because the two measurement passes are optional: a run
 * that skips the performance pass has null timings, and one that skips the memory pass has a null
 * heap. `rowCounts` is always present - the scenario is loaded in every run path.
 */
export interface Scorecard {
    /**
     * PRIMARY data-layer cost: cube ingest + connected-View re-aggregation (Boundaries 1-4), timed
     * around the awaited `applyDiffAsync`. The headline engine cost; grid-sync below is the final
     * stage. Null when the performance pass is skipped.
     */
    engine: TimingStat | null;
    /** FINAL grid-sync stage: Hoist-side transaction build (genTransaction). Null when perf skipped. */
    genTxn: TimingStat | null;
    /** FINAL grid-sync stage: JS-to-AG-Grid bridge call (applyTransaction). Null when perf is skipped. */
    bridgeCall: TimingStat | null;
    /** FINAL grid-sync stage: deferred render/paint after the bridge call. Null when perf is skipped. */
    render: TimingStat | null;
    /** Heap attributed by layer. Null when the memory pass is skipped. */
    heap: HeapAttribution | null;
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
    /** Identifies which implementation produced this result (see {@link DataLayerAdapter.id}). */
    adapterId: string;
    /**
     * Null-scenario instrumentation overhead, in ms - the harness's own measured cost on an empty
     * iteration (HARN-03 "bounded, documented overhead"). Subtract or report alongside results.
     * Null when the performance pass is skipped (the overhead probe runs only with that pass).
     */
    overheadMs: number | null;
}

//------------------------------------------------------------------------------------------------
// Targets & pass/fail (BASE-04)
//------------------------------------------------------------------------------------------------

/** Overall pass/fail outcome for a single metric against its target. */
export type Verdict = 'pass' | 'fail';

/**
 * Performance tier a measured value lands in (D-02 green/yellow/red):
 *  - `comfortable` - meets the aspiration goal (green).
 *  - `degraded`    - passes the floor regression guard but misses aspiration (yellow).
 *  - `hardWall`    - breaches the floor (red).
 */
export type Tier = 'comfortable' | 'degraded' | 'hardWall';

/**
 * Hybrid target for one metric (D-05 / D-07): a `floor` regression guard paired with an
 * `aspiration` business-need goal.
 *
 *  - `floor`      - the baseline-derived guard. Breaching it is a hard failure (red / `hardWall`).
 *  - `aspiration` - the business-need goal. Meeting it is `comfortable` (green); missing it while
 *                   still respecting the floor is `degraded` (yellow).
 *
 * By default a metric is lower-is-better (a SMALLER measured value is better, e.g. latency, heap).
 * Set `higherIsBetter` to flip the direction for the envelope-level metrics, where a BIGGER value
 * is better - the client must sustain AT LEAST the floor shape / throughput.
 */
export interface MetricTarget {
    /** Baseline-derived regression guard; breaching it is a hard failure. */
    floor: number;
    /** Business-need goal; meeting it is `comfortable`. */
    aspiration: number;
    unit: 'ms' | 'bytes' | 'count';
    /**
     * When true, a larger measured value is better and the pass/tier direction inverts (the value
     * must be >= floor to pass). Defaults to false (lower-is-better). Set true for the envelope-level
     * metrics (`maxRecordsXFields`, `sustainedThroughput`).
     */
    higherIsBetter?: boolean;
}

/**
 * The complete BASE-04 target set - the single source of truth for pass/fail that the Data Lab
 * scorecard, comparison table, envelope-summary display, and the distilled BASELINE report all read
 * from, and that Phase 6 reuses unchanged to score candidates.
 *
 * All six targets across the four BASE-04 families are REQUIRED - none is discretionary. Exact
 * numbers are Claude's-discretion and are NOT adopted here; they are adopted at the D-08 checkpoint
 * in plan 03-06 (see {@link DEFAULT_TARGETS}).
 *
 * The metrics split into two evaluation paths:
 *  - PER-SCORECARD (lower-is-better, scored once per run by `evaluateScorecard`).
 *  - ENVELOPE-LEVEL (higher-is-better, scored once per ladder by `evaluateEnvelope` against
 *    whole-ladder boundary facts - NOT rendered as per-scorecard badges).
 */
export interface TargetsConfig {
    /**
     * PER-SCORECARD (BASE-03): end-to-end update->render latency at the ~500x20 reference shape,
     * summed across the four timing stages. Lower is better.
     */
    updateRenderLatencyMs: MetricTarget;
    /**
     * PER-SCORECARD (BASE-02): sustained engine CPU cost, read from the engine stage p95. Lower is
     * better.
     */
    enginePcpuMs: MetricTarget;
    /**
     * PER-SCORECARD (BASE-01): per-tab retained heap ceiling on a reference machine. Lower is better.
     */
    heapCeilingReferenceBytes: MetricTarget;
    /**
     * PER-SCORECARD (BASE-01): per-tab retained heap ceiling on a small-heap machine. Lower is
     * better. Evaluated per run by the caller passing this target as the heap ceiling.
     */
    heapCeilingSmallHeapBytes: MetricTarget;
    /**
     * ENVELOPE-LEVEL (BASE-04 "max records x fields client-side"): the largest leaf-records x fields
     * shape the client sustains within the comfortable tier. Higher is better; scored once per ladder
     * by `evaluateEnvelope`, not as a per-scorecard badge.
     */
    maxRecordsXFields: MetricTarget;
    /**
     * ENVELOPE-LEVEL (BASE-04 "sustained batch size/rate without jank"): the largest
     * batchSize x ratePerSec sustained without breaching the jank wall. Higher is better; scored once
     * per ladder by `evaluateEnvelope`, not as a per-scorecard badge.
     */
    sustainedThroughput: MetricTarget;
}

/**
 * The scored outcome for a single metric: the measured `value` against its `floor`/`aspiration`,
 * the overall `verdict`, whether it met aspiration, and the resulting `tier`.
 */
export interface MetricVerdict {
    /** Metric key, e.g. 'updateRenderLatencyMs'. */
    metric: string;
    value: number;
    floor: number;
    aspiration: number;
    verdict: Verdict;
    meetsAspiration: boolean;
    tier: Tier;
}

/**
 * Ladder-derived boundary facts feeding the envelope-level verdict (D-03). Derived from the whole
 * ladder (savedRuns / envelope-stats), NOT from any single Scorecard:
 *  - `maxComfortableRecordsXFields` - the largest records x fields observed still in the comfortable tier.
 *  - `maxSustainedThroughput`       - the largest batchSize x ratePerSec that still keeps up (no jank wall).
 */
export interface EnvelopeSummary {
    maxComfortableRecordsXFields: number;
    maxSustainedThroughput: number;
}

/**
 * Provisional target set - NOT adopted. Real numbers are adopted at the D-08 checkpoint in plan
 * 03-06; do not treat these as final. Every `floor`/`aspiration` here is the sentinel
 * {@link PROVISIONAL_TARGET} (`-1`), an obviously-invalid placeholder for the ms/bytes/count metrics
 * (all naturally >= 0) that signals "not yet adopted" rather than a committed number. Committing real
 * targets before the checkpoint is a RESEARCH anti-pattern.
 */
export const PROVISIONAL_TARGET = -1;

/**
 * PROVISIONAL default targets - see {@link PROVISIONAL_TARGET}. All values are the not-yet-adopted
 * sentinel; real numbers are adopted at the D-08 checkpoint in plan 03-06. Do not treat as final.
 */
export const DEFAULT_TARGETS: TargetsConfig = {
    updateRenderLatencyMs: {floor: PROVISIONAL_TARGET, aspiration: PROVISIONAL_TARGET, unit: 'ms'},
    enginePcpuMs: {floor: PROVISIONAL_TARGET, aspiration: PROVISIONAL_TARGET, unit: 'ms'},
    heapCeilingReferenceBytes: {
        floor: PROVISIONAL_TARGET,
        aspiration: PROVISIONAL_TARGET,
        unit: 'bytes'
    },
    heapCeilingSmallHeapBytes: {
        floor: PROVISIONAL_TARGET,
        aspiration: PROVISIONAL_TARGET,
        unit: 'bytes'
    },
    maxRecordsXFields: {
        floor: PROVISIONAL_TARGET,
        aspiration: PROVISIONAL_TARGET,
        unit: 'count',
        higherIsBetter: true
    },
    sustainedThroughput: {
        floor: PROVISIONAL_TARGET,
        aspiration: PROVISIONAL_TARGET,
        unit: 'count',
        higherIsBetter: true
    }
};
