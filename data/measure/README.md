# Measurement Harness (`data/measure`)

A config-driven measurement engine for the Hoist data pipeline. It answers, with real numbers,
where time and memory go when data flows through `Cube` -> `View` -> `Store` -> `GridModel` ->
AG Grid, and it does so in a way that lets a candidate data engine be measured apples-to-apples
against the system as it exists today.

This module is the framework-resident **core**. It is intentionally headless and
transport-agnostic: it fetches nothing, knows no endpoints, and renders no UI. The runnable
interactive harness - a scenario picker, run controls, an on-screen scorecard, and a saved-run
comparison - lives in Toolbox as the `Data Lab` example app, which owns all data transport and
drives this core.

## Split architecture

```
hoist-react/data/measure          (this module - the core, fetches nothing)
  types.ts                        ScenarioConfig knobs + RunResult/Scorecard output schema
  CandidateAdapter.ts             the swap seam: baseline OR a candidate engine
  BaselineAdapter.ts              CandidateAdapter over the live Cube/View/Store/GridModel pipeline
  BoundaryInstrumentation.ts      compute / bridge / deferred-render timing split (Boundary 5)
  HeapAttribution.ts              forced GC + per-layer heap accounting
  MeasurementProtocol.ts          warmup-discard + forced-GC-between + median/p95
  MeasurementHarness.ts           runScenarioAsync: scenario + adapter + injected data -> RunResult

Toolbox/client-app/src/examples/datalab   (the runnable UI + data transport)
  ingest/HttpIngestAdapter.ts     pulls dataLab/snapshot + dataLab/diff over HTTP
  ingest/WebSocketIngestAdapter.ts subscribes to the xhDataLab/updates WS push topic
  DataLabModel / DataLabPanel     scenario editor, run controls, scorecard, comparison
```

The boundary is deliberate. The core stays endpoint-free so it can be reused unchanged for later
candidate evaluation; the application (Toolbox) owns the fetch, the seeded test data, and the
on-screen grid.

## The knobs (a scenario is data, not code)

A `ScenarioConfig` is plain serializable JSON, so it round-trips through `ViewManager` JsonBlob
storage as a named, shareable profile. The knob taxonomy:

- **Dataset shape** (`DatasetShapeConfig`): `leafRowCount`, `dimensions`, `fieldCount`,
  `fieldTypeMix` (relative weights for `number` / `string` / `date` / `object` - object-valued
  fields probe the shared-by-reference heap question), `aggregators`, `seed`.
- **Update** (`UpdateConfig`): `pattern` (`steadyTrickle` | `periodicBurst` | `broadReplace` |
  `targetedNarrow`), `breadth`, `batchSize`, `ratePerSec`, `transport` (`http` | `webSocket`),
  `durationSec`.
- **Protocol** (`ProtocolConfig`): `warmupIterations`, `measuredIterations`, `gcSettleMs`
  (defaults in `DEFAULT_PROTOCOL`), persisted with each run so a scorecard records exactly how it
  was measured.

## The scorecard (what a run reports)

Each run produces a `RunResult` with a `Scorecard`:

- **Compute vs bridge.** `compute` is Hoist-side JS (`genTransaction`) timed directly with
  `performance.now()`. `bridgeCall` is the synchronous cost of crossing into AG Grid
  (`applyTransaction`). `render` captures the deferred layout/paint that lands in a later animation
  frame, so the bridge cost is not undercounted. All three are reported as `TimingStat`
  (`medianMs` + `p95Ms` + raw samples).

  Note: `bridgeCall` is only meaningful when a live grid is mounted on the adapter's `GridModel`
  (so `agApi` is populated). The Data Lab UI mounts the on-screen grid on `adapter.gridModel`
  precisely so this measures the real JS-to-AG-Grid crossing rather than call overhead. Without a
  mounted grid, `applyTransaction` is a documented no-op and the bridge sample reflects call
  overhead only.

- **Heap by layer.** Heap attribution is an accounting exercise, not a single API call. Owned
  layers (`cubeStoreRecords`, `gridStoreRecords`, `viewResultRows`) come from record counts times a
  calibrated per-record byte cost. `agGridInternals` is the **opaque remainder** (total heap delta
  minus the owned layers) and is never read from AG Grid source - AG Grid memory is library-owned
  and opaque. Caveat: the no-cross-origin-isolation path uses `performance.memory.usedJSHeapSize`
  whole-heap deltas, which are V8-heap-only and quantized to ~100KB buckets unless the
  precise-memory flag is on (see below).

- **Environment metadata.** Every run is stamped with `EnvMetadata` (userAgent,
  `crossOriginIsolated`, `exposeGc`, `preciseMemory` heuristic, `heapMethod`, timestamp) so saved
  scorecards compare meaningfully across machines.

## The protocol

`runProtocolAsync` runs a steady-state protocol: `setupAsync` once, then `warmupIterations` that
run and are discarded (driving the pipeline into its incremental-transaction steady state, not a
cold full-replace), then `measuredIterations` each preceded by a forced GC + settle. Median and p95
(nearest-rank) are computed over the measured samples.

## Required Chrome launch flags

The forced-GC protocol and un-quantized heap readings require launching Chrome with specific flags.
Reproducible runs must use them; the run records in `EnvMetadata` whether they appear active.

```bash
# Recommended Chrome launch flags for a measurement run:
google-chrome \
  --js-flags="--expose-gc" \           # enables window.gc() for forced GC between iterations
  --enable-precise-memory-info \       # un-quantizes performance.memory (else ~100KB buckets)
  --enable-benchmarking                # reduces some background nondeterminism (optional)
```

- Without `--js-flags="--expose-gc"`, `window.gc()` is unavailable and the between-iteration GC is
  a no-op, so heap deltas are noisier.
- Without `--enable-precise-memory-info`, `performance.memory` is quantized to ~100KB buckets and
  small heap deltas read as 0 or jump in coarse steps. Either set this flag or measure deltas large
  enough to exceed a bucket (more rows).
- `performance.now()` resolution is 100us in non-COI contexts and 5us only when
  `crossOriginIsolated` - both far better than `Date.now()` (1ms).

## Reusing the harness to evaluate a candidate engine

The harness never hardcodes the baseline - it drives whatever `CandidateAdapter` it is handed
through the identical protocol. To measure a candidate data engine apples-to-apples against the
baseline:

1. **Implement `CandidateAdapter`** for the candidate engine: `loadSnapshotAsync(rawRows)`,
   `applyDiffAsync(diff)` (the invariant two-op ingest contract), `getResultRowCount()`,
   `getResultRows()`, `disposeAsync()`. To get a non-trivial `bridgeCall`, also expose
   `genTransaction` / `applyTransaction` and mount a live grid on the engine's `GridModel` (the
   `BaselineAdapter` is the worked reference).
2. **Pre-load the snapshot.** The caller owns all transport. Fetch the initial rows (over HTTP,
   WebSocket, or any source) and call `await adapter.loadSnapshotAsync(rows)` BEFORE handing the
   adapter to the harness. The harness throws a clear error if the adapter is empty at start.
3. **Supply the injected data-provider callbacks.** `nextBatchAsync()` returns the next pre-fetched
   diff batch each iteration; `loadNRowsAsync(n)` / `clearAsync()` back heap calibration.
4. **Run it:**

   ```ts
   import {MeasurementHarness} from '@xh/hoist/data';

   const result = await new MeasurementHarness().runScenarioAsync({
       scenario,        // ScenarioConfig
       adapter,         // pre-loaded CandidateAdapter (baseline or candidate)
       nextBatchAsync,  // () => Promise<PlainObject[]>
       loadNRowsAsync,  // (n: number) => Promise<void>
       clearAsync       // () => Promise<void>
   });
   ```

   Persist the returned `RunResult` (e.g. as a `ViewManager` JsonBlob) and compare it side-by-side
   with the baseline run. One engine, one protocol, comparable scorecards.
