---
phase: 02-measurement-harness
plan: 05
subsystem: data
tags: [measurement, harness, protocol, baseline-adapter, orchestrator, cube, median, p95, run-result]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    plan: 01
    provides: "ScenarioConfig/ProtocolConfig knobs, RunResult/Scorecard/TimingStat/EnvMetadata/HeapAttribution output types, CandidateAdapter seam, DEFAULT_PROTOCOL"
  - phase: 02-measurement-harness
    plan: 03
    provides: "measureGridSync (Boundary-5 compute/bridge/render split), measureOverhead (null-scenario overhead), GridSyncTiming, injected genTransaction/applyTransaction contract"
  - phase: 02-measurement-harness
    plan: 04
    provides: "heapNow, forceGcAndSettleAsync, detectHeapMethod, calibratePerRecordBytesAsync, attributeHeap (no-COI layered heap attribution)"
provides:
  - "runProtocolAsync<S>: warmup-discard + forced-GC-between + N measured iterations (HARN-05)"
  - "median/p95/toTimingStat pure stats helpers (no library, nearest-rank p95)"
  - "BaselineAdapter: concrete CandidateAdapter over the live Cube/View/Store/GridModel pipeline at the invariant two-op ingest contract"
  - "MeasurementHarness.runScenarioAsync: ScenarioConfig + pre-loaded CandidateAdapter + injected data-provider callbacks -> complete RunResult"
  - "Transport/endpoint-agnostic orchestration seam (nextBatchAsync/loadNRowsAsync/clearAsync injected by caller)"
affects: [02-06, toolbox-harness-ui, candidate-evaluation, baseline-adapter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injected-callback orchestration: harness takes a pre-loaded adapter + nextBatchAsync/loadNRowsAsync/clearAsync so the core stays transport/endpoint-agnostic (caller owns all fetch)"
    - "One protocol, any adapter: runScenarioAsync drives baseline and candidate identically (HARN-06) - no hardcoded baseline"
    - "Lazy pipeline build: BaselineAdapter infers cube fields (dimensions vs SUM measures) from the first snapshot row"
    - "Reachable grid-sync seam: adapter mirrors GridLocalModel.genTransaction (impl-only) over the live grid store; applyTransaction binds to agApi only when a grid is mounted"

key-files:
  created:
    - data/measure/MeasurementProtocol.ts
    - data/measure/BaselineAdapter.ts
    - data/measure/MeasurementHarness.ts
  modified:
    - data/measure/index.ts

key-decisions:
  - "BaselineAdapter builds the Cube/View/GridModel pipeline lazily on first loadSnapshotAsync, inferring fields from row keys (declared dimensions vs SUM measures); includeLeaves:true when no dimensions so the grid store still populates"
  - "genTransaction is re-implemented faithfully on the adapter (GridLocalModel.genTransaction is impl-only/unreachable from a programmatic GridModel); applyTransaction is a documented no-op when no grid is mounted (agApi null) - bridge half only non-trivial once 02-06 mounts a live grid"
  - "Heap calibrated once over N=1000 representative rows and applied uniformly to cube/grid/view owned layers; object-valued-field double-counting mitigation lives in calibratePerRecordBytesAsync (02-04)"
  - "preciseMemory heuristic: heap read is non-null AND not an exact 100KB multiple (un-quantized); conservatively false when heap unavailable"
  - "Heap reported as the final steady-state iteration's attribution; timings reduced to median+p95 via toTimingStat over all measured samples"

patterns-established:
  - "Protocol module is engine/scenario-agnostic - pure injected callbacks (setupAsync/runIterationAsync/betweenIterationsAsync) + ProtocolConfig in, samples out"
  - "Adapter exposes optional accessors (getCubeRecordCount/getGridRecordCount/genTransaction/applyTransaction) the harness probes via Partial<BaselineAdapter>, falling back to result row count for a generic candidate"

requirements-completed: [HARN-05, HARN-06]

# Metrics
duration: 7min
completed: 2026-06-29
---

# Phase 2 Plan 05: Measurement Harness Assembly Summary

**The reusable measurement engine: a warmup-discard / forced-GC / median+p95 iteration protocol, a concrete BaselineAdapter over the live Cube/View/Store/GridModel pipeline, and a transport-agnostic MeasurementHarness orchestrator that turns a ScenarioConfig + pre-loaded adapter + injected data callbacks into a complete RunResult.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-29T17:07:11Z
- **Completed:** 2026-06-29T17:14:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `runProtocolAsync<S>` implements the HARN-05 steady-state protocol: `setupAsync` once, `warmupIterations` run-and-discard (Pitfall 6 - drive into incremental-transaction steady state before measuring), then `measuredIterations` each preceded by a forced-GC + settle hook, collecting one sample per measured iteration.
- Pure stats helpers `median`, `p95` (nearest-rank), and `toTimingStat` produce the 02-01 `TimingStat` (median + p95 + raw samples) directly, no library.
- `BaselineAdapter implements CandidateAdapter` over the REAL pipeline: snapshot maps to `Cube.loadDataAsync`, diff to `Cube.updateDataAsync` (the invariant two-op ingest contract), results flow `View.result -> Store -> GridModel`, with caller-supplied rows/diffs only (never fetched).
- `MeasurementHarness.runScenarioAsync` composes protocol (02-05) + `measureGridSync` (02-03) + heap attribution (02-04) into one run that returns a complete `RunResult`, and is reusable for baseline AND any candidate adapter (HARN-06).
- The harness is transport/endpoint-agnostic: it has zero endpoint/URL/fetch knowledge - the caller pre-loads the snapshot and injects `nextBatchAsync`/`loadNRowsAsync`/`clearAsync`.

## `runScenarioAsync` exact signature (for 02-06)

```ts
// from @xh/hoist/data
class MeasurementHarness extends HoistModel {
    runScenarioAsync(args: {
        scenario: ScenarioConfig;
        adapter: CandidateAdapter;                       // PRE-LOADED by caller (see below)
        nextBatchAsync: () => Promise<PlainObject[]>;     // injected per-iteration diff provider
        loadNRowsAsync: (n: number) => Promise<void>;     // injected heap-calibration loader
        clearAsync: () => Promise<void>;                  // injected heap-calibration teardown
    }): Promise<RunResult>;
}

interface HarnessDataProvider {nextBatchAsync; loadNRowsAsync; clearAsync}   // also exported
interface RunScenarioArgs extends HarnessDataProvider {scenario; adapter}    // also exported
```

The args are the conceptual inputs (`scenario` + `adapter`) plus the three injected data-provider callbacks that keep the harness endpoint-free.

## RunResult shape as produced

```ts
RunResult {
    scenario: ScenarioConfig,            // echoed input (knobs persisted with the run)
    scorecard: {
        compute:    TimingStat,          // genTransaction, median + p95 over measured iterations
        bridgeCall: TimingStat,          // applyTransaction (see seam limitation below)
        render:     TimingStat,          // deferred frame after the bridge call
        heap:       HeapAttribution,     // final steady-state iteration's layered attribution
        rowCounts:  {leaf, aggregate, gridRows}
    },
    env: EnvMetadata {                   // captured up front
        userAgent, crossOriginIsolated, exposeGc, preciseMemory, heapMethod, capturedAt
    },
    adapterId: string,                   // adapter.id, e.g. 'baseline-cube'
    overheadMs: number                   // null-scenario instrumentation overhead (HARN-03)
}
```

The harness throws a clear error if `adapter.getResultRowCount() <= 0` at start, so a caller that forgot to pre-load the snapshot fails loudly.

## BaselineAdapter wiring

- Lazily builds `Cube` + connected `View` + `GridModel` on the first `loadSnapshotAsync`, inferring fields from the first row: configured `dimensions` become cube dimension fields; every other non-`id` field becomes a numeric SUM measure. With no dimensions, the View query uses `includeLeaves:true` so the grid store still populates.
- The connected View loads its result rows into the `GridModel.store` (`stores: gridModel.store, connect:true`), so the full `Cube -> View.result -> Store -> GridModel` path runs on every ingest op.
- `disposeAsync` uses `XH.safeDestroy(gridModel, view, cube)` and nulls the refs so iterations start from a clean heap.
- Exposes `genTransaction` / `applyTransaction` (for `measureGridSync`) and `getCubeRecordCount` / `getGridRecordCount` (for heap attribution).

### Grid-sync seam limitation found (genTransaction reachability)

`GridLocalModel.genTransaction` (`cmp/grid/Grid.ts`) is an impl-only method that exists only once the grid COMPONENT is mounted and linked - it is NOT reachable from a `GridModel` instance the harness holds programmatically. The closest faithful reachable seam: the adapter re-implements that exact diff logic (add = new id, update = same id different ref, remove = dropped id) over the live grid store's records, snapshotting the previous filtered record list after each sync. `applyTransaction` binds to `gridModel.agApi.applyTransaction` only when a grid is actually mounted; when `agApi` is null (the common programmatic case, since mounting a real grid is a UI concern owned by 02-06) it is a documented no-op, so compute + heap are still measured but the bridge sample reflects only call overhead. The bridge half becomes the true JS-to-AG-Grid crossing cost once 02-06 mounts a live grid and the adapter's `gridModel` has a live `agApi`.

## What 02-06 (Toolbox UI) must do to drive a scenario

1. PRE-FETCH the initial snapshot rows (over its own HTTP or WebSocket transport - the harness has no endpoint knowledge) and PRE-LOAD them into the adapter via `await adapter.loadSnapshotAsync(rows)` BEFORE handing the adapter to the harness.
2. Construct the adapter: `new BaselineAdapter({dimensions, aggregators})` for the baseline, or a candidate's own `CandidateAdapter`.
3. Supply the injected data-provider callbacks:
   - `nextBatchAsync()` - returns the next pre-fetched diff batch per iteration (Toolbox owns the fetch).
   - `loadNRowsAsync(n)` / `clearAsync()` - load/clear N pre-fetched calibration rows for heap calibration.
4. Call `await new MeasurementHarness().runScenarioAsync({scenario, adapter, nextBatchAsync, loadNRowsAsync, clearAsync})` and persist the returned `RunResult`.
5. To get a non-trivial `bridgeCall`, mount a live Hoist grid bound to `adapter.gridModel` so its `agApi` is populated before the run.

## Task Commits

1. **Task 1: Iteration protocol + baseline cube adapter** - `e8eb38485` (feat)
2. **Task 2: MeasurementHarness orchestrator -> RunResult** - `69919d092` (feat)

## Files Created/Modified
- `data/measure/MeasurementProtocol.ts` - `runProtocolAsync` + `median`/`p95`/`toTimingStat`
- `data/measure/BaselineAdapter.ts` - concrete `CandidateAdapter` over the live Cube/View/Store/GridModel pipeline
- `data/measure/MeasurementHarness.ts` - `runScenarioAsync` orchestrator producing `RunResult`
- `data/measure/index.ts` - added the three new `export *` lines (existing exports preserved)

## Decisions Made
See frontmatter `key-decisions`. Most load-bearing: the lazy field-inferring pipeline build, the faithful re-implementation of `genTransaction` (impl-only seam), and the documented no-op `applyTransaction` fallback when no grid is mounted.

## Deviations from Plan

None affecting scope or behavior. Minor in-file adjustments while authoring (Rule 1/3, no scope change):
- Renamed the adapter's `config` field to `adapterConfig` - `HoistModel` declares a `config` member, so the private field name collided (TS2415).
- Imported `Cube`/`View`/`CubeFieldSpec` from `@xh/hoist/data` (there is no `data/cube` barrel).
- `BaselineAdapter` View query uses `includeLeaves:true` when no dimensions are configured so the grid store still populates (an ungrouped query otherwise returns nothing).
- Used `window.crossOriginIsolated` (not the bare `self`/`crossOriginIsolated` global) to satisfy the project's `no-undef` ESLint rule - same `window.`-prefixing convention 02-03 adopted for `requestAnimationFrame`. The verify grep still matches `crossOriginIsolated`.
- Reworded JSDoc `->` arrows and an `@observable.ref` mention to prose to clear `tsdoc/syntax` `>`-escape warnings (same convention 02-01/02-03/02-04 adopted). Also reworded the endpoint-agnostic doc paragraph so it does not contain the literal `datalab/snapshot` / `datalab/diff` / `fetchJson` / `webSocketService` tokens - the verify grep then correctly proves the core fetches nothing.

---

**Total deviations:** 0 scope/behavior; 5 in-file authoring adjustments (TS/lint/grounding).
**Impact on plan:** None on functionality - all planned code shipped exactly as specified.

## Issues Encountered
- `HoistModel.config` collision and the missing `data/cube` barrel were caught immediately by `npx tsc --noEmit` and fixed before the Task 1 commit. The `self` ESLint `no-undef` was caught by `npx eslint data/measure/` before the Task 2 commit. All resolved; final `tsc --noEmit` and `eslint data/measure/` pass clean.

## User Setup Required
None - no external service configuration required. Pure framework measurement engine; runtime behavior is exercised by the Toolbox harness UI (02-06). Reproducible heap/timing precision needs Chrome run flags (`--js-flags=--expose-gc`, `--enable-precise-memory-info`), which are recorded in `EnvMetadata`, not setup steps for this library plan.

## Next Phase Readiness
- The measurement core is complete and exported from `@xh/hoist/data`: types (02-01) + instrumentation (02-03) + heap (02-04) + protocol + baseline adapter + orchestrator. 02-06 can construct a `BaselineAdapter`, pre-load a snapshot, inject its transport callbacks, and call `runScenarioAsync` to produce a `RunResult`.
- One open follow-up for 02-06: mount a live Hoist grid bound to `adapter.gridModel` so `agApi` is populated and the `bridgeCall` measurement reflects the real JS-to-AG-Grid crossing (without it, the bridge sample is call-overhead only - documented above).
- No blockers.

## Self-Check: PASSED

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
