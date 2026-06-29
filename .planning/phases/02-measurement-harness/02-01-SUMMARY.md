---
phase: 02-measurement-harness
plan: 01
subsystem: data
tags: [measurement, harness, types, cube, candidate-adapter, scenario-config, scorecard]

# Dependency graph
requires:
  - phase: 01-current-state-inventory
    provides: invariant two-op ingest contract (Cube.loadDataAsync/updateDataAsync), View.result -> Store seam, six instrumentation boundaries, heap-attribution layer map
provides:
  - ScenarioConfig knob schema (DatasetShapeConfig + UpdateConfig + ProtocolConfig) as serializable JSON
  - RunResult/Scorecard output schema (compute vs bridge timing median+p95, heap-by-layer, env metadata, row counts)
  - CandidateAdapter plug-in seam interface at the View.result -> Store boundary
  - data/measure barrel re-exported from data/index.ts (public framework surface)
affects: [02-02, 02-03, 02-04, 02-05, 02-06, baseline-adapter, heap-attribution, measurement-protocol, toolbox-harness-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config-driven measurement: ScenarioConfig is plain serializable JSON for ViewManager JsonBlob round-trip"
    - "Common-interface/swap seam (CandidateAdapter) so baseline and candidate run apples-to-apples"
    - "Compute-vs-bridge timing split modeled as distinct Scorecard fields (compute/bridgeCall/render)"

key-files:
  created:
    - data/measure/types.ts
    - data/measure/CandidateAdapter.ts
    - data/measure/index.ts
  modified:
    - data/index.ts

key-decisions:
  - "DEFAULT_PROTOCOL defaults set to warmup=5, measured=20, gcSettleMs=50 (Claude's-discretion, persisted with each run)"
  - "CandidateAdapter.getResultRows() typed unknown[] - row shape is engine-specific; harness only counts/sizes, never interprets"
  - "FieldTypeMix modeled as relative weights (not percentages) for number/string/date/object; generator normalizes"
  - "No concrete BaselineAdapter here - deferred to orchestrator plan 02-05 which owns live Cube/View/GridModel wiring"

patterns-established:
  - "Knob taxonomy first: dataset-shape + update + protocol knobs are the spine; profiles are persisted instances"
  - "Heap attribution as accounting: owned layers explicit, agGridInternals is the opaque remainder, never read from source"

requirements-completed: [HARN-01, HARN-02, HARN-06]

# Metrics
duration: 3min
completed: 2026-06-29
---

# Phase 2 Plan 01: Measurement Core Type Foundation Summary

**Serializable ScenarioConfig knob schema, RunResult/Scorecard output schema, and the CandidateAdapter swap seam - the framework-resident type foundation every other Phase-2 plan consumes.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-29T16:46:11Z
- **Completed:** 2026-06-29T16:49:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Defined the full serializable knob taxonomy (`DatasetShapeConfig`, `UpdateConfig`, `ProtocolConfig`, `ScenarioConfig`) covering HARN-01 dataset-shape and HARN-02 update parameters
- Defined the per-run output schema (`TimingStat`, `HeapAttribution`, `Scorecard`, `EnvMetadata`, `RunResult`) capturing the compute-vs-bridge split and heap-by-layer attribution (HARN-04/HARN-05)
- Defined the `CandidateAdapter` interface (HARN-06) grounded in the confirmed Cube/View signatures, making the harness reusable for baseline and candidate evaluation
- Wired the new `data/measure/` module into the public framework surface via `data/index.ts`

## Exported Type Reference (for downstream plans 02-03/04/05/06)

Importable from `@xh/hoist/data`:

- **Knobs:** `FieldTypeMix`, `DatasetShapeConfig`, `UpdatePattern` (`'steadyTrickle' | 'periodicBurst' | 'broadReplace' | 'targetedNarrow'`), `Transport` (`'http' | 'webSocket'`), `UpdateConfig`, `ProtocolConfig`, `DEFAULT_PROTOCOL` (const), `ScenarioConfig`
- **Output:** `TimingStat` (`{medianMs, p95Ms, samples}`), `HeapMethod` (`'performanceMemory' | 'measureUserAgentSpecificMemory'`), `HeapAttribution`, `Scorecard`, `EnvMetadata`, `RunResult`
- **Seam:** `CandidateAdapter` (`id`, `loadSnapshotAsync(rawRows)`, `applyDiffAsync(diff)`, `getResultRowCount()`, `getResultRows()`, `disposeAsync()`)

## Confirmed Cube/View signatures the adapter mirrors

Verified via `hoist-ts members Cube` / `View` and source read:
- `Cube.loadDataAsync(rawData: PlainObject[], info: PlainObject): Promise<void>` -> `CandidateAdapter.loadSnapshotAsync`
- `Cube.updateDataAsync(rawData: PlainObject[] | StoreTransaction, infoUpdates: PlainObject): Promise<void>` -> `CandidateAdapter.applyDiffAsync`
- `View.result: ViewResult = null` - observable object exposing `rows: ViewRowData[]` -> read-back via `getResultRowCount` / `getResultRows`

`PlainObject` confirmed exported from `@xh/hoist/core` (`core/types/Types.ts`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the harness config + result type schema** - `cfef4b3c4` (feat)
2. **Task 2: Define the CandidateAdapter seam and barrel exports** - `dddc5c3a3` (feat)

## Files Created/Modified
- `data/measure/types.ts` - Full serializable knob + output type schema with compute-vs-bridge and invariant-ingest comments
- `data/measure/CandidateAdapter.ts` - HARN-06 plug-in seam interface at the View.result -> Store boundary
- `data/measure/index.ts` - Barrel re-exporting types + adapter
- `data/index.ts` - Added `export * from './measure'` after the cube exports block

## Decisions Made
- `DEFAULT_PROTOCOL` = warmup 5 / measured 20 / settle 50ms - sane reproducible defaults persisted with each run
- `getResultRows()` typed `unknown[]` since the row shape is engine-specific; the harness only counts and sizes rows
- `FieldTypeMix` uses relative weights (generator normalizes) rather than strict percentages
- Concrete `BaselineAdapter` intentionally deferred to orchestrator plan 02-05 (it needs live Cube/View/GridModel instances)

## Deviations from Plan

None - plan executed exactly as written. (One in-line wording adjustment: replaced a `->` arrow in a JSDoc comment with "to" phrasing to satisfy the tsdoc linter - not a behavior or scope change.)

## Issues Encountered
- tsdoc lint flagged a literal `>` in a JSDoc `->` arrow as a potential HTML tag. Reworded that single comment ("JS-to-AG-Grid") and re-linted clean. No impact on types or scope.

## User Setup Required
None - no external service configuration required. Pure type/contract foundation; no runtime behavior.

## Next Phase Readiness
- Type foundation complete and exported from `@xh/hoist/data`. Plans 02-03 (heap attribution), 02-04 (boundary instrumentation / scorecard), 02-05 (orchestrator + BaselineAdapter), and 02-06 can import the exact `ScenarioConfig`/`RunResult`/`Scorecard`/`CandidateAdapter` names documented above.
- No blockers. The adapter interface is grounded in real Phase-1 contracts, so the baseline implementation in 02-05 maps directly onto it.

## Self-Check: PASSED

All created files present (`data/measure/types.ts`, `data/measure/CandidateAdapter.ts`, `data/measure/index.ts`), the `data/index.ts` re-export verified, and both task commits (`cfef4b3c4`, `dddc5c3a3`) exist in git history.

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
