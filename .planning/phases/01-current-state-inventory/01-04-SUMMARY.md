---
phase: 01-current-state-inventory
plan: 04
subsystem: docs
tags: [architecture, data-layer, cube, store, view, gridmodel, mobx, mermaid, instrumentation]

# Dependency graph
requires:
  - phase: 01-current-state-inventory
    provides: "INV-02 copy-vs-reuse map, INV-03 MobX granularity trace, INV-04 transport inventory (the three Wave 1 deep-dives integrated here)"
provides:
  - "Authoritative current-state data architecture document (ARCHITECTURE.md) covering Store/Cube/View/GridModel and the end-to-end data flow"
  - "Three Mermaid diagrams: component/data-flow, reactivity sequence, copy-vs-reuse edges"
  - "Named Phase 2 instrumentation boundaries tied to HARN-03/04/05 - the bridge into Phase 2"
  - "Integrated summaries of INV-02/03/04 with links, plus consolidated carried-forward open questions"
affects: [phase-2-harness, HARN-03, HARN-04, HARN-05, BASE, baseline-measurement, data-2.0-design]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Single authoritative current-state doc that supersedes scattered validation notes and integrates deep-dives by reference + summary"]

key-files:
  created:
    - docs/planning/data2/ARCHITECTURE.md
  modified: []

key-decisions:
  - "ARCHITECTURE.md is the single authoritative current-state doc; the validation notes (KICKOFF-VALIDATION + A/B/C) are retained only as historical backing"
  - "Phase 2 instrumentation is framed as six attributable boundaries (cube ingest, noteCubeUpdated re-aggregation, View.result write, Store/_filtered rebuild, dataReaction->applyTransaction bridge, and heap-attribution layers) each mapped to HARN-03/04/05"
  - "The shared-store contract (Store as AG-Grid-independent substrate) is named as the seam later phases must protect, with the explicit tension against 'just use AG Grid features'"

patterns-established:
  - "Integrate companion deep-dives by summary + link, never duplicate their full source-cited detail"
  - "Ground load-bearing architecture claims with file:line citations against a pinned source revision"

requirements-completed: [INV-01]

# Metrics
duration: 5min
completed: 2026-06-28
---

# Phase 1 Plan 4: Authoritative Current-State Architecture Document Summary

**One source-grounded architecture doc for the hoist-react data layer - Store/Cube/View/GridModel, the end-to-end flow, three Mermaid diagrams, integrated INV-02/03/04 findings, and the six named Phase 2 instrumentation boundaries that bridge into HARN-03/04/05.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-28T00:46:03Z
- **Completed:** 2026-06-28T00:50:55Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- Authored ARCHITECTURE.md (527 lines): a single current-state reference covering the four core
  artifacts (Store, Cube, View, GridModel) with responsibility, key API, observation surface, and the
  validated corrections, each grounded with file:line citations against `develop` commit `3e8d6ea`.
- Documented the shared-store contract (the AG-Grid-independent substrate) and both production wiring
  patterns - declarative `createView({connect:true})` + `setStores`, and the manual MobX-reaction +
  `executeQuery` + `gridModel.loadData` loop - with abstracted, app-name-free code samples.
- Added the end-to-end data flow narrative (transport -> Cube ingest -> imperative View push ->
  `View.result` MobX seam -> connected Store load -> `_filtered` rebuild -> synchronous AG Grid
  transaction -> render) and three Mermaid diagrams (component/data-flow flowchart, incremental-update
  sequence, copy-vs-reuse edge annotation).
- Integrated INV-02/03/04 by concise summary + link, named the six attributable Phase 2 instrumentation
  boundaries tied to HARN-03/04/05, and consolidated the carried-forward open questions as Phase 2
  measurement targets - so the doc supersedes the validation notes a reader otherwise had to assemble.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the architecture narrative (Store/Cube/View/GridModel + two wiring patterns)** - `e7934f892` (docs)
2. **Task 2: Add Mermaid diagrams, end-to-end flow, integrated findings, Phase 2 instrumentation points** - `13e05facb` (docs)

**Plan metadata:** committed separately (this SUMMARY + STATE + ROADMAP + REQUIREMENTS).

## Files Created/Modified

- `docs/planning/data2/ARCHITECTURE.md` - Authoritative current-state data architecture: core artifacts,
  shared-store contract, two wiring patterns, end-to-end data flow, three Mermaid diagrams, integrated
  INV-02/03/04 summaries, Phase 2 instrumentation boundaries, and carried-forward open questions.

## Decisions Made

- Made ARCHITECTURE.md explicitly supersede the validation notes (now historical backing) while folding
  in every validated correction, so no later phase needs to read the older notes.
- Framed Phase 2 instrumentation as a six-row boundary table mapping each source seam to what it measures
  (heap vs. timing vs. throughput) and the specific HARN requirement (03 boundary timing, 04 heap
  attribution, 05 compute-vs-bridge split), making the harness hook directly.
- Added a third (optional) Mermaid diagram annotating copy-vs-reuse edges, since it sharpens the
  heap-attribution story the instrumentation section depends on.

## Deviations from Plan

None - plan executed exactly as written. Both tasks completed in order; all verification steps
(file existence, four artifact sections, both wiring patterns, >= 2 Mermaid diagrams, three companion-doc
links, instrumentation-points naming loadDataAsync/updateDataAsync/View.result/applyTransaction, and the
open-repo client-name guard) passed.

## Issues Encountered

None. Spot-checked the load-bearing source citations (View.result `@observable.ref`, Store `_filtered`
rebuild, Cube `freezeData:false`, Grid `applyTransaction`/`getRowId`, Cube ingest + view fan-out) directly
against source before writing - all matched the line references the Wave 1 docs carry.

## User Setup Required

None - documentation only, no external service configuration required.

## Next Phase Readiness

- INV-01 satisfied; Phase 1 (Current-State Inventory) deliverables are complete (INV-01/02/03/04).
- The Phase 2 bridge is established: ARCHITECTURE.md names the concrete instrumentation boundaries and ties
  each to HARN-03/04/05, so the harness work can hook directly at those seams.
- Carried-forward open questions are consolidated as Phase 2 measurement targets (AG Grid node footprint,
  object-field sharing, reuseRecords/freezeData in practice, row-cache/committedData retention, action-batch
  coalescing, genTransaction/applyTransaction cost at scale, remount full-replacement cost).
- Open repo: ARCHITECTURE.md and all docs/planning/data2 files pass the client-name guard (no private names).

---
*Phase: 01-current-state-inventory*
*Completed: 2026-06-28*

## Self-Check: PASSED

- FOUND: docs/planning/data2/ARCHITECTURE.md
- FOUND: .planning/phases/01-current-state-inventory/01-04-SUMMARY.md
- FOUND commit: e7934f892 (Task 1)
- FOUND commit: 13e05facb (Task 2)
