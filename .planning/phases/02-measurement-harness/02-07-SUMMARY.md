---
phase: 02-measurement-harness
plan: 07
subsystem: measurement-harness
tags: [measurement, harness, pipeline, cube, view, treeMode, includeLeaves, performance-now, otel, gap-closure]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    plan: 03
    provides: "Boundary instrumentation primitives - measureBoundary/measureGridSync, runner().span() for structure + performance.now() for the number, the xhDataLab. tag prefix"
  - phase: 02-measurement-harness
    plan: 05
    provides: "MeasurementHarness.runScenarioAsync + runIterationAsync, BaselineAdapter over the live Cube/View/Store/GridModel two-op pipeline, IterationSample/Scorecard reduction"
provides:
  - "measurePipeline(): times the awaited cube-ingest + connected-View re-aggregation (Boundaries 1-4) as the PRIMARY compute metric, with a defensive settle hook and a PipelineTiming {ingestMs, settleMs, totalMs} result"
  - "Scorecard.pipeline TimingStat - the headline compute number - alongside the now-clarified compute/bridgeCall/render Boundary-5 grid-sync split"
  - "BaselineAdapter that materializes a real large-leaf-plus-aggregate TREE: treeMode GridModel + single isTreeColumn + connected View with includeLeaves:true, and row-count accessors over the full hierarchy"
affects: [heap-protocol, 02-08, baseline-measurement, phase-03, candidate-evaluation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Time the awaited pipeline, not the relay: wrap adapter.applyDiffAsync (Cube.updateDataAsync -> connected-View noteCubeUpdated -> generateRows/loadStores/updateResults -> View.result write, all settled within the await) in performance.now() brackets to capture Boundaries 1-4 as the primary number"
    - "Primary-then-final stage ordering: pipeline compute (cube+view) measured first as the headline, grid-sync (genTransaction/applyTransaction, Boundary 5) measured second as the final relay stage"
    - "Realistic shape via includeLeaves:true (unconditional) + treeMode grid with one tree column, so leaf facts sit under the deepest aggregate node instead of collapsing to a flat top-level aggregate"

key-files:
  created: []
  modified:
    - "data/measure/BoundaryInstrumentation.ts - added measurePipeline() + exported PipelineTiming"
    - "data/measure/types.ts - Scorecard.pipeline TimingStat + clarified stage-ordering JSDoc"
    - "data/measure/MeasurementHarness.ts - runIterationAsync times the pipeline as primary compute, then grid-sync; reduceScorecard reduces pipeline samples"
    - "data/measure/BaselineAdapter.ts - treeMode grid + isTreeColumn + includeLeaves:true View + full-hierarchy row-count accessors"

key-decisions:
  - "measurePipeline brackets the single awaited applyDiffAsync with performance.now() (confirmed in source: Cube.updateDataAsync awaits forEachAsync(connectedViews, noteCubeUpdated), which synchronously runs generateRows->loadStores->updateResults within that await) - so one await captures Boundaries 1-4; an optional settleAsync hook times any residual async as settleMs (0 when omitted)"
  - "Scorecard keeps compute/bridgeCall/render but their JSDoc is reframed as the FINAL grid-sync stage; the new pipeline field is documented as the PRIMARY compute metric, with explicit stage ordering (pipeline -> grid-sync compute -> bridge -> render)"
  - "treeMode is gated on !isEmpty(dimensions) (a tree column requires at least one dimension) while includeLeaves:true is unconditional - the no-dimension case still surfaces flat leaves and stays valid, the dimensioned case becomes a real tree"
  - "Row-count accessors use the grid store's allCount (full loaded hierarchy incl. leaves) so counts feed 02-08 heap attribution over the whole materialized tree, not just the top aggregate level"

patterns-established:
  - "Measure the engine, report the relay: the harness's headline compute is the cube+view pipeline (~60-627 ms at 5k-50k leaves), with the ~1-4 ms genTransaction relay reported as a separate final stage rather than mislabeled as compute"
  - "Pipeline + grid-sync stage split surfaced as distinct Scorecard TimingStats for clean per-stage comparison across runs"

requirements-completed: [HARN-01, HARN-03, HARN-05]

# Metrics
duration: ~10min (impl) + live verification session
completed: 2026-06-29
---

# Phase 2 Plan 07: Pipeline-Timing + Tree-Shape Gap Closure Summary

**The measurement harness now times the real cube-ingest + connected-View re-aggregation pipeline (Boundaries 1-4) as the PRIMARY compute metric - 60-627 ms across 5k-50k leaves - instead of the ~1 ms grid relay it previously mislabeled as compute, and the BaselineAdapter materializes a genuine treeMode large-leaf-plus-aggregate tree (includeLeaves:true) so leaf facts sit under the deepest aggregate node rather than collapsing to a flat ~9-row top-level aggregate.**

## Performance

- **Duration:** ~10 min implementation (commit window 16:00-16:04 PDT) plus a live flagged-Chrome verification session
- **Tasks:** 3 auto + 1 checkpoint (human-verify, APPROVED on live browser evidence)
- **Files:** 4 modified (no new files)

## Accomplishments

- **Pipeline timing as primary compute (Task 1 + 2, gap 1 / HARN-03+HARN-05).** `measurePipeline()` brackets the awaited `adapter.applyDiffAsync` in `performance.now()` (inside a `runner().span('xhDataLab.pipeline')` for structure), capturing the full Cube.updateDataAsync -> connected-View re-aggregation -> store rebuild -> View.result write that settles within that single await. It returns `PipelineTiming {ingestMs, settleMs, totalMs}` with an optional defensive `settleAsync` flush. `runIterationAsync` now runs the pipeline FIRST (primary compute), then `measureGridSync` as the Boundary-5 final stage; `reduceScorecard` reduces the pipeline samples into a new `Scorecard.pipeline` TimingStat. The old behavior timed only `measureGridSync` while the engine work ran untimed on the line before.
- **Real tree shape (Task 3, gap 2 / HARN-01).** `BaselineAdapter.buildPipeline` now builds a `treeMode` GridModel with exactly one `isTreeColumn: true` (the first dimension) and a connected View with `includeLeaves: true` unconditionally - replacing the degenerate `includeLeaves: isEmpty(dimensions)` that surfaced only the top aggregate level. Row-count accessors recurse / use the grid store's `allCount` to reflect the full aggregate-plus-leaf hierarchy (feeding 02-08 heap attribution).
- **Type-clean.** `npx tsc --noEmit` passes for hoist-react (exit 0).

## Live Verification Evidence (Task 4 checkpoint - APPROVED)

Verified live in flag-launched Chrome (`--js-flags=--expose-gc --enable-precise-memory-info`) against the Toolbox Data Lab with inline hoist-react (`yarn startWithHoist`) + the Grails test API:

- **TREE SHAPE (gap 2) CONFIRMED.** The grid renders as an expandable tree with chevrons. Row counts Leaf/Aggregate/Grid = `5000 / 5587 / 5587` and `50000 / 50587 / 50587` (previously a flat ~9-row collapse with no chevrons). `includeLeaves:true` + treeMode materialize leaves under the deepest aggregate nodes.
- **PIPELINE TIMING (gap 1) CONFIRMED at the hoist-react layer** via the persisted `RunResult.scorecard.pipeline`: median **60.3 ms (p95 63.2)** at 5000 leaves and **627 ms (p95 691)** at 50000 leaves - the real cube-ingest + view-re-aggregation cost. The grid-relay "compute" (genTransaction) was only **0.7 ms / 4.1 ms** respectively, i.e. the harness previously reported the ~1 ms relay tail as "compute" while the ~60-627 ms engine work went unmeasured. Pipeline scales ~linearly with leaf count (sanity check passed).

## Deviations from Plan

### Auto-fixed / refined Issues

**1. [Rule 1 - Refinement] treeMode gated on dimensions rather than unconditional `treeMode: true`**
- **Found during:** Task 3
- **Issue:** A `treeMode` grid requires a tree column, which requires at least one dimension. Setting `treeMode: true` with zero dimensions (the valid no-dimension flat case) would assert a tree column that does not exist.
- **Fix:** `treeMode: !isEmpty(dimensions)` (tree only when dimensions are configured) while keeping `includeLeaves: true` UNCONDITIONAL per the plan - so the dimensioned case is a real tree and the no-dimension case keeps surfacing flat leaves.
- **Files modified:** `data/measure/BaselineAdapter.ts`
- **Verification:** Live tree render confirmed at 5k/50k leaves with 3 dimensions; tsc clean.
- **Committed in:** `bf09c4031` (Task 3 commit)

---

**Total deviations:** 1 refinement (treeMode dimension gating). No scope change - all planned artifacts shipped: `measurePipeline` + `PipelineTiming`, `Scorecard.pipeline`, pipeline-first iteration wiring, and the treeMode/includeLeaves tree shape.
**Impact on plan:** The refinement keeps the no-dimension scenario valid; the dimensioned case meets HARN-01 exactly as specified.

## Deferred Items (handed off to 02-08)

Surfaced during the live verification, deferred by agreement:

1. **Scorecard pipeline-row display (Toolbox UI lag).** The Toolbox scorecard UI (`DataLabPanel.ts` timings table) still shows only Compute / Bridge / Render and does not yet surface the new `pipeline` field. The data IS captured (persisted in `RunResult.scorecard.pipeline`); only the display lags. Folded into 02-08.
2. **rAF Page-Visibility hardening.** The "Render (deferred frame)" metric, measured by awaiting `requestPostAnimationFrame`/`requestAnimationFrame` in `BoundaryInstrumentation.ts`, produced a 44706 ms p95 outlier during the slow 50000-leaf run. Diagnosed as a backgrounded-tab artifact: Chrome suspends rAF callbacks for hidden tabs, so one iteration's frame-await spanned a hidden window. Confirmed NOT a harness bug and NOT overlapping runs (`runScenarioAsync` guards with `if (this.running) return`; the protocol awaits each iteration's frame serially). A clean re-run at 5000 leaves with the tab visible produced render samples of 0.9-1.4 ms across all 20 iterations (zero outliers). Recommend a Page Visibility guard be considered in 02-08.

## Task Commits

hoist-react repo (branch `data2`), pre-committed before the checkpoint approval (NOT re-created in closeout):

1. **Task 1: measurePipeline() + PipelineTiming + Scorecard.pipeline TimingStat** - `a5b03bad2` (feat) - `data/measure/BoundaryInstrumentation.ts`, `data/measure/types.ts`
2. **Task 2: wire pipeline timing into iteration + scorecard** - `f2e50aff8` (feat) - `data/measure/MeasurementHarness.ts`
3. **Task 3: BaselineAdapter builds a real large-leaf-plus-aggregate tree** - `bf09c4031` (feat) - `data/measure/BaselineAdapter.ts`

**Plan metadata:** committed separately in this closeout (docs).

## Issues Encountered

- None during planned work. The rAF p95 outlier (above) was a verification-time observation diagnosed as a backgrounded-tab artifact, not a harness defect; deferred to 02-08 for an optional Page Visibility guard.

## User Setup Required

None - no external service configuration changed. (Live verification used the established flagged-Chrome + `yarn startWithHoist` + Grails test API workflow.)

## Next Phase Readiness

- Gaps 1 and 2 from 02-VERIFICATION.md are closed: the harness measures the right work (cube+view pipeline) against the right shape (large-leaf-plus-aggregate tree), both confirmed live.
- The full-hierarchy row-count accessors are in place for 02-08's heap attribution.
- 02-08 inherits two deferred items: surface the `pipeline` field in the Toolbox scorecard UI, and consider a Page Visibility guard for the deferred-render metric.

## Self-Check: PASSED

- Commits `a5b03bad2`, `f2e50aff8`, `bf09c4031` confirmed present on branch `data2` (git show --stat) - NOT re-created.
- Modified files present: `data/measure/BoundaryInstrumentation.ts` (exports `measurePipeline` + `PipelineTiming`), `data/measure/types.ts` (`Scorecard.pipeline: TimingStat`), `data/measure/MeasurementHarness.ts` (`measurePipeline` wired, `pipeline:` in IterationSample), `data/measure/BaselineAdapter.ts` (`treeMode`, one `isTreeColumn`, `includeLeaves: true`, no `isEmpty(dimensions)` on the query).
- `npx tsc --noEmit` passes (exit 0).

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
