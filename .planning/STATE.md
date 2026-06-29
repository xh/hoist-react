# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** An evidence-based answer - backed by a reusable measurement harness and real
heap/throughput numbers - to whether and how to build a Data 2.0 layer for `hoist-react`.
**Current focus:** Phase 2 - Measurement Harness (Phase 1 complete)

## Current Position

Phase: 2 of 8 (Measurement Harness) - IN PROGRESS (4/6 plans complete)
Last completed: Phase 2 Plan 03 - Boundary instrumentation layer (HARN-03/05; 2 tasks, 2026-06-29) [wave 2 with 02-04]
Status: Phase 2 planned and executing; plans 01-04 of 6 complete
Next action: /gsd:execute-phase 2 (continue with the next plan)

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
Stopped at: Phase 2 wave-2 plans complete. Plan 02-03 (boundary instrumentation) added
  `data/measure/BoundaryInstrumentation.ts`: measureBoundary() (runner().span() OTel structure +
  performance.now() number, HARN-03), measureGridSync() (Boundary-5 compute/bridge/deferred-render
  split via requestPostAnimationFrame, HARN-05), measureOverhead() (null-scenario median overhead
  probe). genTransaction/applyTransaction are injected callables - orchestrator 02-05 wires the
  live grid's transaction builder + agApi.applyTransaction. Commits 6ca2ccd61, df20f7a47.
  Requirements HARN-03/HARN-05 marked complete. Plan 02-04 (heap attribution) ran concurrently in
  the same wave. 2 plans remain in Phase 2 (02-05 orchestrator, 02-06).
Resume: /gsd:execute-phase 2 (continue with the next plan). Note: gsd-tools `state advance-plan`,
  `record-session`, `update-progress`, and `phase complete` parsing does not match this project's
  prose STATE/ROADMAP format - Current Position, Session Continuity, and the progress bar are
  maintained by hand; the metric table, decision log, roadmap progress, and requirements checkboxes
  update via gsd-tools.
Resume file: None
