# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-27)

**Core value:** An evidence-based answer - backed by a reusable measurement harness and real
heap/throughput numbers - to whether and how to build a Data 2.0 layer for `hoist-react`.
**Current focus:** Phase 1 - Current-State Inventory

## Current Position

Phase: 1 of 8 (Current-State Inventory)
Plan: 2 of 4 complete in current phase
Status: In Progress
Last activity: 2026-06-28 - Completed 01-01 (copy-vs-reuse map, INV-02)

Progress: [█████░░░░░] 50%

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

Last session: 2026-06-28
Stopped at: Completed 01-01-PLAN.md (copy-vs-reuse map, INV-02)
Resume file: None
