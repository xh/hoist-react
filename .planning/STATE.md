# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** An evidence-based answer - backed by a reusable measurement harness and real
heap/throughput numbers - to whether and how to build a Data 2.0 layer for `hoist-react`.
**Current focus:** Phase 2 - Measurement Harness (Phase 1 complete)

## Current Position

Phase: 2 of 8 (Measurement Harness) - IN PROGRESS (5/6 plans complete)
Last completed: Phase 2 Plan 05 - Measurement harness assembly: protocol + BaselineAdapter + orchestrator (HARN-05/06; 2 tasks, 2026-06-29) [wave 3]
Status: Phase 2 planned and executing; plans 01-05 of 6 complete
Next action: /gsd:execute-phase 2 (execute the final plan, 02-06)

Milestone progress: [█░░░░░░░] 1/8 phases complete

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-current-state-inventory P03 | 2min | 2 tasks | 1 files |
| Phase 01-current-state-inventory P01 | 2min | 1 tasks | 1 files |
| Phase 01 P02 | 22min | 1 tasks | 1 files |
| Phase 01-current-state-inventory P04 | 5min | 2 tasks | 1 files |
| Phase 02-measurement-harness P01 | 3min | 2 tasks | 4 files |
| Phase 02-measurement-harness P02 | 18min | 3 tasks | 3 files |
| Phase 02-measurement-harness P03 | 4min | 2 tasks | 2 files |
| Phase 02-measurement-harness P04 | 3min | 2 tasks | 2 files |
| Phase 02-measurement-harness P05 | 7min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 8 phases derived from 42 requirements (comprehensive depth) - HARN/BASE/DEMO split
  into separate phases (2/3/4); DEMO and SPEC are harness-independent and may run in parallel.
- Roadmap: Phase 1 consolidates the committed validation notes into the authoritative architecture
  doc rather than starting cold - codebase-mapping is folded into Phase 1.
- Kickoff: Data 2.0 may stand alongside the current system, not replace in-place (coexistence is a
  design requirement).
- Validation: transport is pluggable/transport-agnostic; weighted-avg is a custom Aggregator; MobX
  observability enters at the `View.result` boundary (not a cube-level observable).
- INV-02: a single leaf datum has 4+ concurrent parsed/record representations (raw, cube
  `StoreRecord.data`, leaf `ViewRowData`, grid `StoreRecord.data`); every Store boundary re-parses
  into a new `data` object via `parseRaw`, while AG Grid references the record by ref. The
  `StoreRecord` -> AG Grid node edge is the Phase 2 heap-attribution boundary (opaque library memory).
- [Phase 01-current-state-inventory]: Transport inventory: every delivery transport collapses to the invariant two-operation ingest contract (snapshot -> Cube.loadDataAsync, diff -> Cube.updateDataAsync), making transport-agnosticism a clean knob for HARN-02
- [Phase 01-current-state-inventory]: WebSocket data push (XH.webSocketService) documented as first-class and distinct from WebSocket-as-notification; no Hoist-native SignalR client, so SignalR is bridged at the app/service layer to the same ingest contract
- INV-03: MobX observation along View.result -> Store -> GridModel -> AG Grid is at whole-reference
  granularity (new ViewResult ref at `View.result` @observable.ref; new RecordSet ref at
  `Store._filtered` @observable.ref), while AG Grid updates are a per-record diff applied
  synchronously via one `agApi.applyTransaction()` call (`Grid.ts:693`) - no async/batching layer,
  only implicit MobX action coalescing. Cube->view and store-mutation->rebuildFiltered are imperative
  pushes, not MobX-observed. Reactions are mounted-only (GridLocalModel.onLinked, gated on agApi).
- INV-01: ARCHITECTURE.md is the single authoritative current-state doc (supersedes the validation
  notes, integrates INV-02/03/04). It names six attributable Phase 2 instrumentation boundaries -
  cube ingest (loadDataAsync/updateDataAsync), noteCubeUpdated re-aggregation, the View.result
  @observable.ref write, Store/_filtered rebuild, the dataReaction->genTransaction->applyTransaction
  bridge, and the heap-attribution layers - each mapped to HARN-03 (boundary timing), HARN-04 (heap
  attribution by layer), and HARN-05 (compute-vs-bridge split). This is the Phase 2 bridge.
- [Phase 02-measurement-harness]: HARN type foundation: ScenarioConfig knob schema + RunResult/Scorecard output + CandidateAdapter seam, all serializable JSON exported from data/index.ts
- [Phase 02-measurement-harness]: Plan 02-02: Toolbox datalab namespace adds a seeded server-side test-data API (HARN-01/02) - generator + HTTP snapshot/diff + WebSocket push, all emitting an identical batch shape so the client ingest adapter resolves any transport to the one two-op contract
- [Phase 02-measurement-harness]: Plan 02-03: boundary instrumentation - spans for structure (runner().span() into OTel), performance.now() for the number; Boundary-5 split into compute/bridge/deferred-render (requestPostAnimationFrame); genTransaction/applyTransaction injected to decouple from GridModel
- [Phase 02-measurement-harness]: Plan 02-04: heap attribution is no-COI by design - performance.memory.usedJSHeapSize whole-heap deltas (Hoist InspectorService precedent), per-field-shape load-N-divide calibration, owned layers by count x calibrated bytes, AG Grid internals as the floored opaque remainder (never read from source); COI measureUserAgentSpecificMemory deferred (no Hoist-layer breakdown)
- [Phase 02-measurement-harness]: Plan 02-05: measurement engine assembled - runProtocolAsync (warmup-discard + forced-GC-between + median/p95, HARN-05), BaselineAdapter implementing CandidateAdapter over the live Cube/View/Store/GridModel two-op ingest, and MeasurementHarness.runScenarioAsync composing protocol+measureGridSync+attributeHeap into a RunResult. Transport/endpoint-agnostic: caller pre-loads the snapshot and injects nextBatchAsync/loadNRowsAsync/clearAsync. One protocol runs baseline and any candidate (HARN-06). genTransaction re-implemented on the adapter (GridLocalModel.genTransaction is impl-only); applyTransaction is a documented no-op until 02-06 mounts a live grid with agApi.

### Pending Todos

[From .planning/todos/pending/ - ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Open licensing question: AG Grid Enterprise entitlement for AG Grid 36 features (calculated columns,
  "show values as," FormulaModule) per client - must be confirmed in Phase 5 (SPEC-06) before the spec
  depends on any of them.
- Per-client transport + cross-origin-isolation (COOP/COEP) deployability matrix gates SharedArrayBuffer
  and backend-aggregation candidates - needed before Phase 6 scoring is finalized.
- OPEN REPO: no private client/customer names in any committed file. Allowed names: Hoist, Toolbox,
  JobSite. A local PreToolUse guard blocks commits containing forbidden names.

## Session Continuity

Last session: 2026-06-29
Stopped at: Phase 2 wave-3 plan 02-05 complete - the measurement engine is assembled. Added three
  files to `data/measure/` plus the barrel. `MeasurementProtocol.ts`: `runProtocolAsync<S>`
  (setupAsync once, warmup-discard iterations, then N measured each preceded by a forced-GC+settle
  hook, returning samples) + pure `median`/`p95`(nearest-rank)/`toTimingStat` (HARN-05).
  `BaselineAdapter.ts`: `class BaselineAdapter extends HoistModel implements CandidateAdapter` over
  the live Cube/View/Store/GridModel pipeline - snapshot to `Cube.loadDataAsync`, diff to
  `Cube.updateDataAsync` (invariant two-op ingest), caller-supplied data only; builds the pipeline
  lazily (infers cube dimension/SUM-measure fields from the first row; `includeLeaves:true` when no
  dimensions); exposes `genTransaction`/`applyTransaction` + `getCubeRecordCount`/`getGridRecordCount`.
  SEAM LIMITATION: `GridLocalModel.genTransaction` is impl-only/unreachable from a programmatic
  GridModel, so the adapter re-implements the diff faithfully over the live grid store;
  `applyTransaction` is a documented no-op until 02-06 mounts a live grid with a populated `agApi`.
  `MeasurementHarness.ts`: `runScenarioAsync({scenario, adapter, nextBatchAsync, loadNRowsAsync,
  clearAsync}) -> RunResult` composing protocol + `measureGridSync` (02-03) + `attributeHeap` (02-04),
  capturing `EnvMetadata` up front, throwing if the adapter is not pre-loaded. TRANSPORT/ENDPOINT-
  AGNOSTIC: the harness fetches nothing; the caller pre-loads the snapshot and injects the data
  callbacks. One protocol runs baseline (BaselineAdapter) AND any candidate (HARN-06). Commits
  `e8eb38485` (Task 1), `69919d092` (Task 2). HARN-05/HARN-06 marked complete. 1 plan remains in
  Phase 2: 02-06 (Toolbox harness UI) - which pre-fetches/pre-loads the snapshot, supplies
  nextBatchAsync, optionally mounts a live grid to make `bridgeCall` non-trivial, and calls
  runScenarioAsync.
Resume: /gsd:execute-phase 2 (execute the final plan, 02-06). Note: gsd-tools `state advance-plan`,
  `record-session`, `update-progress`, and `phase complete` parsing does not match this project's
  prose STATE/ROADMAP format - Current Position, Session Continuity, and the progress bar are
  maintained by hand; the metric table, decision log, roadmap progress, and requirements checkboxes
  update via gsd-tools.
Resume file: None
