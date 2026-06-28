---
phase: 01-current-state-inventory
plan: 02
subsystem: data
tags: [mobx, ag-grid, cube, store, reactivity, observable-ref, applyTransaction]

# Dependency graph
requires:
  - phase: 01-current-state-inventory
    provides: validated Store/Cube/View/GridModel terminology and the View.result MobX seam finding (KICKOFF-VALIDATION, B-grid-mobx)
provides:
  - "Source-cited MobX reaction-granularity trace of View.result -> Store -> GridModel -> AG Grid"
  - "Per-hop record-vs-batch granularity verdict table"
  - "Pinpointed synchronous applyTransaction site (Grid.ts:693) with no async/batching layer"
  - "Mounted-component reaction lifecycle (GridLocalModel.onLinked, agApi gating)"
  - "Resolution of two open questions: View.result is @observable.ref; rebuildFiltered is imperative"
affects: [phase-2-baseline, harness, data-2.0-engine-seam, heap-map]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Whole-reference (RecordSet/ViewResult) observation granularity; per-record work only inside genTransaction/applyTransaction"
    - "Imperative push at cube->view and store-mutation->rebuildFiltered boundaries (not MobX-observed)"

key-files:
  created:
    - docs/planning/data2/MOBX-GRANULARITY.md
  modified: []

key-decisions:
  - "Documented View.result as plain @observable.ref (View.ts:109-110), not computed or reaction-derived - resolves B-grid-mobx open question #1"
  - "Documented Store.rebuildFiltered as imperative (called from every mutation and setFilter), with NO filter reaction in the constructor - resolves B-grid-mobx open question #2"
  - "Recorded that the View feeds Stores imperatively (loadData full / updateData per-record) in parallel with the @observable.ref result seam"

patterns-established:
  - "Granularity verdict table format: Hop | Record/Batch | Mechanism | Cite"
  - "Source-inconclusive points are explicitly carried to Phase 2 as measurement targets"

requirements-completed: [INV-03]

# Metrics
duration: 22min
completed: 2026-06-28
---

# Phase 1 Plan 02: MobX Reaction-Granularity Trace Summary

**Source-cited trace proving observation is at whole-RecordSet/whole-ViewResult reference
granularity while AG Grid updates are a per-record diff applied synchronously via a single
`agApi.applyTransaction()` call inside a mounted-only GridLocalModel reaction.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-28T00:20:00Z
- **Completed:** 2026-06-28T00:42:35Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- Traced every hop of `View.result -> Store -> GridModel -> AG Grid` with a record-vs-batch verdict
  and file:line citations, including a synthesis granularity-verdict table.
- Pinpointed the synchronous `agApi.applyTransaction()` site (`Grid.ts:693`) reached via
  `dataReaction -> syncData() -> genTransaction()` (three-way diff by `agId`), and established that
  there is no `applyTransactionAsync`, no explicit batching/debounce on the data reaction, and that
  the only coalescing is implicit MobX action batching.
- Documented the mounted-component reaction lifecycle: the eleven AG-Grid-driving reactions live in
  `GridLocalModel` and are registered in `onLinked()` (`Grid.ts:186-203`), gated on
  `isReady`/`agApi` (`@observable.ref` set on `handleGridReady`, nulled on `handleGridUnmount`);
  `GridModel` itself holds only an editing-debounce reaction plus a conditional sizing-mode reaction.
- Made the imperative cube->view push explicit and distinct from the `View.result` MobX seam, with
  citations (`Cube.ts:131,282-286,299-314` vs. `View.ts:109-110,335-341`).
- Resolved both carried-forward open questions from source: `View.result` is a plain
  `@observable.ref`, and `Store.rebuildFiltered()` is invoked imperatively from every mutation and
  from `setFilter()`, with no MobX reaction on `this.filter` in the constructor.

## Task Commits

1. **Task 1: Trace the reaction path and classify granularity end to end** - `7bdc5b19e` (docs)

**Plan metadata:** committed with STATE/ROADMAP/REQUIREMENTS update (see final commit).

## Files Created/Modified
- `docs/planning/data2/MOBX-GRANULARITY.md` - The full reaction-granularity trace (315 lines):
  path-at-a-glance diagram, five hop sections with granularity verdicts, synthesis verdict table,
  mounted-component lifecycle section, and a list of source-inconclusive measurement targets.

## Decisions Made
- Reported `GridModel`'s reaction set precisely: an always-on editing-debounce reaction
  (`GridModel.ts:752-756`) plus a conditional sizing-mode reaction (`GridModel.ts:1943-1949`),
  rather than the looser "essentially one reaction" framing, since both were read in source.
- Surfaced the View's parallel imperative store-feeding path (`loadStores` full vs.
  `dataOnlyUpdate` per-record), which is what actually drives a cube-backed grid - distinct from the
  `view.result` observable that direct (non-Store) consumers observe.

## Deviations from Plan

None - plan executed exactly as written. All claims were grounded by reading the source files named
in the plan's `<context>` (Cube.ts, View.ts, Store.ts, Grid.ts, GridModel.ts) plus AgGridModel.ts
and AgGrid.ts to confirm the mounted-lifecycle wiring of `agApi`.

## Issues Encountered
- The hoist-react MCP `hoist-get-symbol`/`hoist-get-members` tools were not exposed under the
  expected names in this session; `hoist-ts members View` returned the `cmp/viewmanager` View, not
  the `data/cube` View. Resolved by reading the cube `View.ts` source directly (the authoritative
  source for decorators), which the plan explicitly required anyway ("do not guess - read them").

## User Setup Required
None - documentation-only deliverable, no external service configuration required.

## Next Phase Readiness
- INV-03 satisfied. Phase 2 (BASE) now has a concrete cost model: real-time throughput is bounded by
  synchronous, per-record transaction application on the main thread inside a mounted component.
- Five source-inconclusive points are recorded in the doc as Phase 2 measurement targets (action
  batching coalescing, genTransaction cost at scale, sync-vs-async applyTransaction, remount
  full-replacement cost, record-reuse effect on identity diffing).
- The companion Phase 1 deliverable - the copy-vs-reuse heap map - remains outstanding and is
  referenced by inconclusive point #5.

## Self-Check: PASSED

- FOUND: docs/planning/data2/MOBX-GRANULARITY.md
- FOUND: .planning/phases/01-current-state-inventory/01-02-SUMMARY.md
- FOUND: commit 7bdc5b19e (Task 1)

---
*Phase: 01-current-state-inventory*
*Completed: 2026-06-28*
