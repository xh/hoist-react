---
phase: 01-current-state-inventory
plan: 01
subsystem: data
tags: [cube, store, view, storerecord, ag-grid, mobx, memory, object-identity]

# Dependency graph
requires:
  - phase: 00-kickoff-validation
    provides: validated Store/Cube/View terminology and architecture (KICKOFF-VALIDATION.md, A-store-cube-view.md)
provides:
  - Source-cited copy-vs-reuse map across all five data-pipeline transitions
  - Resolution of A-store-cube-view open questions A-1/A-2 (leaf and aggregate-row object identity) from source
  - Identified heap-attribution boundary at the StoreRecord -> AG Grid node edge for Phase 2
affects: [02-heap-attribution, baseline-measurement, data-2.0-spec]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object-identity reasoning grounded in file:line source citations rather than measurement"

key-files:
  created:
    - docs/planning/data2/COPY-VS-REUSE.md
  modified: []

key-decisions:
  - "Leaf ViewRowData shallow-copies field values from the cube StoreRecord.data (not shared) - resolved from LeafRow.ts source"
  - "Connected stores re-parse ViewRowData into a new StoreRecord.data via parseRaw; the ViewRowData is retained only as raw - resolved from Store.ts source"
  - "AG Grid node graph is opaque library memory; flagged as the Phase 2 heap-attribution boundary rather than read from source"

patterns-established:
  - "Every copy-vs-reference verdict carries a hoist-react source file:line citation"

requirements-completed: [INV-02]

# Metrics
duration: 2min
completed: 2026-06-28
---

# Phase 1 Plan 01: Copy-vs-Reuse Map Summary

**Source-cited map of object identity across the data pipeline - raw object -> StoreRecord -> leaf/aggregate ViewRowData -> grid StoreRecord -> AG Grid node - resolving where each datum is copied vs. shared by reference.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-28T00:39:20Z
- **Completed:** 2026-06-28T00:41:22Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Traced and documented all five pipeline transitions with copied-vs-referenced verdicts, each backed by a file:line citation into hoist-react source.
- Resolved the two A-store-cube-view open questions from source: leaf rows shallow-copy field values into a new `ViewRowData` (`LeafRow.ts:41-43`), and connected stores re-parse each `ViewRowData` into a fresh `StoreRecord.data` via `parseRaw` (`Store.ts:1203-1217`), retaining the `ViewRowData` only as `raw`.
- Confirmed aggregate/group rows are genuinely new allocations (computed, not shared) and documented the `dataOnlyUpdate()` in-place mutation fast path and why it forbids `reuseRecords: true` on connected stores (`View.ts:554-558`).
- Documented the single-datum walkthrough (one field value through to an AG Grid cell) enumerating every concurrent in-memory representation.
- Flagged the `StoreRecord -> AG Grid node` edge as the opaque heap-attribution boundary for Phase 2, plus five explicit measurement targets that source alone cannot settle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trace object identity through source and assemble the copy-vs-reuse map** - `decef3729` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `docs/planning/data2/COPY-VS-REUSE.md` - Copy-vs-reuse map across the full data pipeline with object-identity reasoning, a summary table, per-transition sections, a single-datum walkthrough, and a Phase 2 measurement-target list (305 lines).

## Decisions Made
- Treated leaf-row identity, aggregate-row identity, and the View-to-Store load as all resolvable from source (they were) rather than deferring to measurement; only library-internal AG Grid memory and workload-dependent quantities were deferred to Phase 2.
- Documented object-valued fields as shared-by-reference across transitions (no transition deep-clones), with the net heap impact left as an empirical question.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INV-02 satisfied: a reader can determine, at every pipeline transition, where data is copied vs. referenced, grounded in source citations.
- Heap-attribution boundaries and five measurement targets are explicitly enumerated as direct inputs to Phase 2.
- Output passes the local open-repo client-name guard (no forbidden names).

## Self-Check: PASSED

- FOUND: docs/planning/data2/COPY-VS-REUSE.md
- FOUND: .planning/phases/01-current-state-inventory/01-01-SUMMARY.md
- FOUND: commit decef3729

---
*Phase: 01-current-state-inventory*
*Completed: 2026-06-28*
