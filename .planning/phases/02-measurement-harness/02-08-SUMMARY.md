---
phase: 02-measurement-harness
plan: 08
subsystem: measurement-harness
tags: [measurement, harness, heap, baseline, calibration, median, render, page-visibility, gap-closure]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    plan: 04
    provides: "No-COI heap attribution scaffolding - performance.memory deltas, per-record calibration, AG Grid opaque remainder"
  - phase: 02-measurement-harness
    plan: 05
    provides: "MeasurementHarness.runScenarioAsync + runIterationAsync, BaselineAdapter over the live Cube/View/Store/GridModel two-op pipeline, forced-GC/median+p95 protocol"
  - phase: 02-measurement-harness
    plan: 07
    provides: "measurePipeline() primary compute timing, treeMode/includeLeaves large-leaf-plus-aggregate tree, full-hierarchy row-count accessors that feed heap attribution"
provides:
  - "Fixed clean post-GC empty-pipeline heap baseline captured BEFORE the snapshot loads, so total retained heap is positive (fixes the -28.2 MB inverted within-iteration delta)"
  - "BaselineAdapter.clearPipelineAsync() - a true-empty hook (Cube.clearAsync re-aggregates the connected View to empty + clears the grid store) that keeps the pipeline instances alive for bridge measurement"
  - "HarnessDataProvider.reloadSnapshotAsync hook - restores the snapshot the harness intentionally cleared to capture the empty baseline"
  - "N=50000 median-of-5-repeats per-record calibration on a dedicated empty pipeline so owned-layer signal clears the tens-of-MB GC/heap noise floor"
  - "Deferred-render page-visibility hardening: visibilityState detection + Promise.race(RENDER_FRAME_TIMEOUT_MS=1000) cap mark a backgrounded-tab rAF sample renderSuspect instead of recording a multi-second artifact"
  - "Toolbox scorecard surfaces Scorecard.pipeline as the PRIMARY compute row + comparison table lists Pipeline median/p95"
affects: [baseline-measurement, phase-03, candidate-evaluation, heap-attribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed empty-baseline differencing: capture a clean post-GC heap on a TRULY-EMPTY pipeline before the snapshot loads, then difference every iteration's post-GC heap against that fixed reference (not a within-iteration pre/post-GC delta that goes negative)"
    - "True-empty without disposal: Cube.clearAsync empties data + re-aggregates the connected View to empty + clears the grid store while keeping cube/view/gridModel alive, so the mounted grid survives for the bridge measurement (vs disposeAsync which nulls them)"
    - "Calibrate above the noise floor: a 50000-row load (10x the default scenario) moves a measurable tens-of-MB delta, repeated 5x with median-of-repeats, so owned per-layer bytes resolve instead of flooring to 0"
    - "Flag-don't-trust suspect samples: detect a suspended rAF frame (hidden tab OR timeout) at the measurement boundary and mark renderSuspect rather than silently recording a multi-second render"

key-files:
  created: []
  modified:
    - "data/measure/HeapAttribution.ts - attributeHeap differences against emptyBaselineHeap; captureEmptyBaselineHeapAsync helper; calibratePerRecordBytesAsync takes repeats(5)/n(50000) and returns the median"
    - "data/measure/BaselineAdapter.ts - clearPipelineAsync() true-empty hook (cube.clearAsync + reset prevRecords, no nulling)"
    - "data/measure/MeasurementHarness.ts - HarnessDataProvider.reloadSnapshotAsync; runScenarioAsync clears to empty, captures the fixed baseline, reloads the snapshot AFTER calibration, threads emptyBaselineHeap into every attributeHeap"
    - "data/measure/BoundaryInstrumentation.ts - nextRenderFrameAsync returns {suspect}; visibilityState + Promise.race(RENDER_FRAME_TIMEOUT_MS=1000) cap; measureGridSync returns renderSuspect"
    - "data/measure/types.ts - GridSyncTiming gains renderSuspect"
    - "data/measure/README.md - empty-baseline-first heap protocol, N=50000 median-of-5 calibration, render page-visibility hardening + keep-the-tab-foregrounded operating note"
    - "../toolbox/client-app/src/examples/datalab/DataLabModel.ts - wires clearPipelineAsync (calibration teardown) + reloadSnapshotAsync provider hooks; adds Pipeline median/p95 comparison rows"
    - "../toolbox/client-app/src/examples/datalab/DataLabPanel.ts - scorecard surfaces Pipeline (cube + view) as the PRIMARY compute row; Compute reframed as (genTransaction, grid relay)"

key-decisions:
  - "Total retained heap is differenced against a FIXED clean post-GC empty-pipeline baseline captured before the snapshot loads, reached by truly emptying the live pipeline (Cube.clearAsync) - NOT by reloading the snapshot (which would make the delta ~0) and NOT by a within-iteration pre/post-GC read (which goes negative)"
  - "clearPipelineAsync uses Cube.clearAsync (keeps the pipeline alive) rather than disposeAsync (nulls cube/view/gridModel) so the mounted grid survives for the bridge measurement"
  - "Calibration is pinned at N=50000 / repeats=5 (not a 'sane larger N') because the committed floor-at-0 means an under-resolved load silently reads 0 again - the load MUST move a measurable tens-of-MB delta to clear the noise floor"
  - "Render suspect detection is OR-combined: visibilityState==='hidden' around the await AND a Promise.race timeout cap (RENDER_FRAME_TIMEOUT_MS=1000) - generous vs single-digit-ms clean renders, tight vs the 44.7 s artifact"
  - "reloadSnapshotAsync runs AFTER calibrateAsync (not before) so the MEASURED run uses the full scenario - calibration's clear callbacks share the measured adapter and would otherwise leave it empty (deviation/fix below)"

patterns-established:
  - "Fixed empty-baseline heap differencing across iterations for a positive retained-heap total"
  - "True-empty-but-alive pipeline clear (Cube.clearAsync) as the calibration teardown + baseline-capture path, distinct from snapshot reload and from full disposal"
  - "Boundary-level suspect flagging for the deferred-render metric so a hidden-tab rAF suspension cannot silently inflate a faster/lighter claim"

requirements-completed: [HARN-03, HARN-04, HARN-05, HARN-06]

# Metrics
duration: ~implementation + live verification session
completed: 2026-06-29
---

# Phase 2 Plan 08: Heap-Protocol Gap Closure Summary

**Heap attribution is now trustworthy: total retained heap differences each iteration against a FIXED clean post-GC empty-pipeline baseline captured before the snapshot loads (positive +78.8 MB, no longer the inverted -28.2 MB), owned layers resolve via an N=50000 median-of-5 calibration that clears the noise floor, the Toolbox scorecard surfaces the cube+view Pipeline as the PRIMARY compute row, and the deferred-render metric is hardened against backgrounded-tab rAF suspension - all live-verified in flagged Chrome.**

## Performance

- **Tasks:** 6 auto + 1 checkpoint (human-verify, APPROVED on live browser evidence)
- **Files:** 8 modified (6 hoist-react, 2 Toolbox); no new files
- **Repos:** hoist-react (branch `data2`), Toolbox (branch `data2` (renamed from `data2`))

## Accomplishments

- **Fixed empty-pipeline heap baseline (Tasks 1+2, gap 3 / HARN-04).** `attributeHeap` now differences against a `emptyBaselineHeap` (a clean post-GC reading captured on a truly-empty pipeline before the snapshot loads) instead of a within-iteration pre-GC read, so the total is positive retained heap rather than the negative "how much the GC freed" value. `captureEmptyBaselineHeapAsync(settleMs)` provides that reading. `BaselineAdapter.clearPipelineAsync()` reaches true-empty via `Cube.clearAsync()` (re-aggregates the connected View to empty + clears the grid store) while keeping cube/view/gridModel alive. The harness clears the pipeline, captures the fixed baseline, then restores the snapshot via the new `reloadSnapshotAsync` provider hook.
- **Sturdy per-layer calibration (Task 1, HARN-04).** `calibratePerRecordBytesAsync` takes `repeats=5` and a default `n=50000` and returns the median (imported from `MeasurementProtocol`) per-record bytes - a tens-of-MB load that clears the documented GC/heap variance, so owned layers read non-negative and plausible instead of flooring to 0.
- **Pipeline as the primary compute in the Toolbox UI (Tasks 3+4, HARN-03/06).** The scorecard Timings table now shows `Pipeline (cube + view)` as the FIRST/primary row (via the existing `timingRow` + `model.fmtMs`), with the relay reframed as `Compute (genTransaction, grid relay)`; the saved-run comparison table lists Pipeline median + p95 above the Compute rows.
- **Render page-visibility hardening (Task 5, HARN-05).** `nextRenderFrameAsync` detects a hidden tab (`document.visibilityState`) around the frame await and caps it with `Promise.race(RENDER_FRAME_TIMEOUT_MS=1000)`; a suspended sample is flagged through `GridSyncTiming.renderSuspect` rather than recorded as a multi-second paint cost.
- **README protocol doc (Task 6).** Documents the empty-baseline-first heap methodology, the N=50000 median-of-5 calibration, the new `reloadSnapshotAsync`/`clearPipelineAsync` provider hooks, and the render hardening + keep-the-tab-foregrounded operating note.
- **Type-clean.** `npx tsc --noEmit` passes for hoist-react (exit 0).

## Live Verification Evidence (Task 7 checkpoint - APPROVED)

Verified live in flag-launched Chrome (`--js-flags=--expose-gc --enable-precise-memory-info`, COI false) against the Toolbox Data Lab, default 5000-leaf / 3-dimension tree scenario, after the `18d339e70` fix:

- **Tree shape intact.** Row counts Leaf/Aggregate/Grid = `5000 / 5587 / 5587` (full scenario; the tree renders with chevrons and leaves - confirming the measured run uses the full snapshot, not a near-empty pipeline).
- **Pipeline is the primary compute.** Pipeline (cube + view) = **58.1 ms median / 60.5 ms p95**, surfaced as the PRIMARY compute row in both the scorecard AND the comparison table; `Compute (grid relay)` = **0.6 ms** - so the pipeline is ~95x the relay tail.
- **Heap total is POSITIVE.** Total delta = **+78.8 MB** (the -28.2 / -98.9 MB inversion is gone). Per-layer: cube 3.5 MB, grid 4.0 MB, view 4.0 MB, AG Grid remainder 67.4 MB; owned + remainder = total exactly, all non-negative and plausible.
- **Render is clean.** Deferred-frame render = **3.5 ms median / 7.5 ms p95 / 7.5 ms max**, 0 samples over 900 ms - no multi-second outlier (the backgrounded-tab artifact is gone; the renderSuspect/visibility+timeout hardening is in place).
- **Comparison table.** Compare Saved Runs renders Pipeline median + p95 as the top two rows above Compute.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Snapshot reload ran BEFORE calibration, leaving the measured run against a near-empty pipeline**
- **Found during:** Task 7 (live verification)
- **Issue:** Initial live verification showed the MEASURED scenario running against a near-empty pipeline - row counts 242/245/245 and pipeline 2.8 ms instead of the expected ~5000/5587 counts and ~60 ms. Root cause: calibration's load/clear callbacks (Toolbox `loadNRowsAsync` / `clearAsync`) target the MAIN measured adapter, and `reloadSnapshotAsync()` ran BEFORE `calibrateAsync`, so calibration's final `clearPipelineAsync` left the pipeline empty and the no-op `setupAsync` never reloaded it.
- **Fix:** Moved `reloadSnapshotAsync()` to AFTER `calibrateAsync` (immediately before `runProtocolAsync`). The empty baseline stays captured up front so the heap total remains positive, while the measured run now sees the full restored scenario.
- **Files modified:** `data/measure/MeasurementHarness.ts`
- **Verification:** Re-verified live - full 5000/5587/5587 counts, 58.1 ms pipeline, +78.8 MB positive heap total.
- **Committed in:** `18d339e70` (fix, post-checkpoint)

---

**Total deviations:** 1 auto-fixed (1 bug). No scope change - all planned artifacts shipped.
**Impact on plan:** The fix was required for correctness: without it the headline measured run was against a near-empty pipeline. The empty-baseline capture (which depends on the up-front clear) is preserved, so the heap total stays positive.

## Residual Design Notes

- **Calibration shares the measured adapter.** The calibration load/clear callbacks operate on the same MAIN measured adapter rather than a dedicated calibration pipeline. This is why the reload-ordering bug above existed and why the reload must run after calibration. A future hardening could give calibration its own isolated pipeline so its load/clear cycle cannot perturb the measured adapter's state. Known and accepted for this plan.
- **Harmless stale buggy saved run in the demo.** A saved run captured during the pre-fix verification (the near-empty-pipeline readings) remains in the demo's persisted run history. It is harmless - the Compare view simply shows it as an outlier; new runs are correct.

## Issues Encountered

- The reload-ordering bug (above) was surfaced by live verification and fixed in `18d339e70`. No other issues during planned work.

## User Setup Required

None - no external service configuration changed. Live verification used the established flagged-Chrome + `yarn startWithHoist` + Grails test API workflow.

## Task Commits

hoist-react repo (branch `data2`), pre-committed before checkpoint approval (NOT re-created in closeout):

1. **Tasks 1+2: fixed empty-pipeline heap baseline + true-empty clear hook + median-of-repeats calibration** - `0242943c0` (feat) - `HeapAttribution.ts`, `BaselineAdapter.ts`, `MeasurementHarness.ts`
2. **Task 5: harden deferred-render measurement against backgrounded-tab rAF suspension** - `aa0bfd5bb` (feat) - `BoundaryInstrumentation.ts`, `types.ts`
3. **Task 6: document empty-baseline-first heap protocol + render page-visibility hardening** - `ffd708afa` (docs) - `README.md`
4. **FIX (post-checkpoint): reload snapshot after calibration so the measured run uses the full scenario** - `18d339e70` (fix) - `MeasurementHarness.ts`

Toolbox repo (branch `data2` (renamed from `data2`)):

5. **Task 3: wire true-empty + reload provider hooks, add Pipeline comparison rows** - `306b0c43` (feat) - `DataLabModel.ts`
6. **Task 4: surface Pipeline (cube + view) as the PRIMARY compute scorecard row** - `70b2a461` (feat) - `DataLabPanel.ts`

**Plan metadata:** committed separately in this closeout (docs).

## Next Phase Readiness

- All three gaps from 02-VERIFICATION.md are now closed: gap 1 (pipeline timing) and gap 2 (tree shape) by 02-07, gap 3 (heap protocol) by this plan. The harness measures the right work, against the right shape, with a trustworthy positive heap total and plausible per-layer attribution.
- Phase 2 is ready for goal re-verification: all 8 plans complete (6 original + 2 gap-closure). HARN-01..06 all complete.
- Phase 3 (Baseline Performance Envelope) can begin once the phase goal re-verification passes.
- Residual hardening (dedicated calibration pipeline) is noted for a future pass but does not block Phase 3.

## Self-Check: PASSED

- **Commits confirmed present (NOT re-created):** hoist-react `0242943c0`, `aa0bfd5bb`, `ffd708afa`, `18d339e70` on branch `data2`; Toolbox `306b0c43`, `70b2a461` on branch `data2` (renamed from `data2`).
- **hoist-react file content verified:** `HeapAttribution.ts` (emptyBaselineHeap / captureEmptyBaselineHeapAsync / repeats - 15 hits), `BaselineAdapter.ts` (clearPipelineAsync), `MeasurementHarness.ts` (reloadSnapshotAsync / emptyBaselineHeap - 9 hits), `BoundaryInstrumentation.ts` (visibilityState / RENDER_FRAME_TIMEOUT / renderSuspect - 14 hits), `README.md` (baseline / reload / foreground - 16 hits).
- **Toolbox file content verified:** `DataLabModel.ts` (reloadSnapshotAsync / clearPipelineAsync / Pipeline median - 5 hits), `DataLabPanel.ts` (Pipeline (cube + view) / grid relay - 2 hits).
- **`npx tsc --noEmit` passes** for hoist-react (exit 0).
- **Note (file location, not a defect):** the plan assumed `renderSuspect` would be added to `GridSyncTiming` in `types.ts`; the implementation kept the `GridSyncTiming` interface colocated with its producer in `BoundaryInstrumentation.ts` (line 175) where it was already defined. The flag is present and threaded through `measureGridSync` exactly per the must-have; only the file housing the interface differs.

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*

## Post-Close Adjustment (Data Lab demo persistence) - 2026-06-30

Recorded after Phase 2 closed, during interactive Phase-3 prep. The Data Lab demo's run-history
persistence described above (`runViewManager`, one named view per run) was a misuse of ViewManager:
runs are transient, un-named measurement records, not named/shared/curated views. It was corrected -
`runViewManager` removed (`AppModel` + `DataLabModel`); `savedRuns` now persists to localStorage via
`@persist.with({localStorageKey: 'dataLab.savedRuns'})` (with a confirm-guarded Clear History control),
and the redundant custom "Save Profile" button was dropped in favor of the built-in `viewManager()`
controls already in the app bar (scenario profiles stay ViewManager-driven). Toolbox-only change; does
NOT affect this plan's HARN-04/05 deliverables or the Phase 2 goal re-verification (the 5/5 observable
truths are harness-core, independent of demo persistence). Full rationale in the STATE.md decision log.
