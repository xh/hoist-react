---
phase: 02-measurement-harness
verified: 2026-06-29T21:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 2/5
  gaps_closed:
    - "Compute cost of the data pipeline (cube ingest + view re-aggregation) is measured separately from bridge cost (HARN-03, HARN-05) - closed by 02-07 measurePipeline + 02-08 scorecard surfacing."
    - "The harness reproduces realistic large-leaf-plus-aggregate shapes (HARN-01) - closed by 02-07 treeMode + includeLeaves:true."
    - "Heap is attributed by layer with a non-COI fallback, plausible non-negative per-layer footprints under a forced-GC protocol (HARN-04, HARN-05) - closed by 02-08 fixed empty-pipeline baseline + N=50000 median-of-5 calibration."
  gaps_remaining: []
  regressions: []
---

# Phase 2: Measurement Harness Verification Report

**Phase Goal:** Build the reusable, configurable, OTel-instrumented harness that is the sole adjudicator of every later "faster/lighter" claim - parameterizing result shape, update pattern, and transport; separating compute cost from bridge cost; and attributing heap by layer with a non-isolated fallback. Durable infrastructure, must exist before any candidate is scored.
**Verified:** 2026-06-29T21:30:00Z
**Status:** passed
**Re-verification:** Yes - after gap closure (02-07 pipeline timing + tree shape, 02-08 heap protocol + scorecard UI + render hardening). The three gaps from the initial 02-VERIFICATION.md (2/5) are now closed; this pass cross-checks the gap-closure code against the orchestrator's flagged-Chrome LIVE evidence.

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Dataset generator parameterizes shape AND reproduces realistic large-leaf-plus-aggregate shapes (HARN-01) | ✓ VERIFIED | Generator parameterization was already confirmed. The degenerate flat-aggregate defect is fixed: `BaselineAdapter.buildPipeline` now sets `treeMode: !isEmpty(dimensions)` with one `isTreeColumn` (the first dimension) and a connected View with `includeLeaves: true` UNCONDITIONALLY (BaselineAdapter.ts:269,284); row-count accessors read `store.allCount` over the full hierarchy (BaselineAdapter.ts:127,229). LIVE: real expandable tree with chevrons + leaves under aggregates; Leaf/Aggregate/Grid = 5000/5587/5587 and 50000/50587/50587 (prior ~9-row flat collapse gone). |
| 2   | Update generator parameterizes pattern, breadth, throughput, transport (HARN-02) | ✓ VERIFIED | Unchanged from initial pass. HTTP + WebSocket transports live; scenario knobs (pattern, batchSize, breadth, ratePerSec) drive the update stream (types.ts UpdateConfig; DataLabModel transport seam). Regression-checked: code intact. |
| 3   | Heap attributed by layer with non-COI fallback, plausible non-negative per-layer footprints under forced-GC (HARN-04, HARN-05) | ✓ VERIFIED | Both methodology defects fixed. (1) Total heap now differences each iteration's post-GC read against a FIXED clean post-GC EMPTY-pipeline baseline captured before the snapshot loads: harness order is clearPipelineAsync -> captureEmptyBaselineHeapAsync -> calibrate -> reloadSnapshotAsync (MeasurementHarness.ts:163-178); `attributeHeap` computes `heapNow() - emptyBaselineHeap` (HeapAttribution.ts:202). (2) Per-layer calibration is N=50000 / median-of-5 above the noise floor (MeasurementHarness.ts:249-257, HeapAttribution.ts:138-168). `clearPipelineAsync` uses `Cube.clearAsync` keeping the pipeline alive (BaselineAdapter.ts:160). LIVE: total +78.8 MB (was -28.2/-98.9); per-layer cube 3.5 / grid 4.0 / view 4.0 / AG Grid remainder 67.4 MB, all non-negative, owned + remainder = total exactly. |
| 4   | Compute cost separated from bridge cost at boundaries, median+p95 under forced-GC protocol (HARN-03, HARN-05) | ✓ VERIFIED | `runIterationAsync` now times the awaited `adapter.applyDiffAsync` (cube ingest + connected-View re-aggregation, Boundaries 1-4) via `measurePipeline` as the PRIMARY compute FIRST, then `measureGridSync` (Boundary 5) as the final relay stage (MeasurementHarness.ts:293-306); `reduceScorecard` emits `pipeline` as a distinct median+p95 TimingStat alongside compute/bridgeCall/render (MeasurementHarness.ts:331-352). `measurePipeline` brackets the await with `performance.now()` inside an `xhDataLab.pipeline` span (BoundaryInstrumentation.ts:120-155). LIVE: pipeline 58.1 ms median / 60.5 ms p95 at 5k (627 ms at 50k) vs grid-relay genTransaction "compute" 0.6 ms - the engine cost is now the headline, not the ~1 ms relay tail. |
| 5   | Config-driven, documented, reusable for BOTH baseline and candidate evaluation (HARN-06) | ✓ VERIFIED | Unchanged + extended. Config-driven via FormModel + ViewManager profiles; harness drives any `CandidateAdapter` through one protocol (MeasurementHarness class doc); README documents the empty-baseline-first heap protocol, N=50000 median-of-5 calibration, the `reloadSnapshotAsync`/`clearPipelineAsync` provider hooks, and the keep-the-tab-foregrounded operating note (README.md:67-172). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `data/measure/BoundaryInstrumentation.ts` | `measurePipeline` + `PipelineTiming`; render hardening | ✓ VERIFIED | `measurePipeline` (line 120) returns `PipelineTiming {ingestMs, settleMs, totalMs}`; `nextRenderFrameAsync` returns `{suspect}` via visibilityState + `Promise.race(RENDER_FRAME_TIMEOUT_MS=1000)` (lines 46,286-308); `GridSyncTiming.renderSuspect` (line 175) threaded through `measureGridSync` (line 238). |
| `data/measure/MeasurementHarness.ts` | pipeline timed as primary; empty-baseline-first heap order | ✓ VERIFIED | `runIterationAsync` times pipeline first then grid-sync (lines 293-306); empty-baseline order clear -> capture -> calibrate -> reload (lines 163-178); `emptyBaselineHeap` threaded into every `attributeHeap` (line 317-324); `reduceScorecard` reduces `pipeline` samples (line 331). |
| `data/measure/HeapAttribution.ts` | fixed empty-baseline differencing; median-of-repeats calibration | ✓ VERIFIED | `captureEmptyBaselineHeapAsync` (line 90); `attributeHeap` differences against `emptyBaselineHeap` (line 202); `calibratePerRecordBytesAsync` takes `n=50000`/`repeats=5`, floors each sample at 0, returns median (lines 138-168). |
| `data/measure/BaselineAdapter.ts` | treeMode + includeLeaves:true tree; clearPipelineAsync; full-hierarchy counts | ✓ VERIFIED | `treeMode: !isEmpty(dimensions)` + one `isTreeColumn` (lines 267-274); `includeLeaves: true` unconditional (line 284); `clearPipelineAsync` via `Cube.clearAsync` keeps pipeline alive (line 160); `getResultRowCount`/`getGridRecordCount` use `store.allCount` (lines 127,229). |
| `data/measure/types.ts` | `Scorecard.pipeline` TimingStat; stage-ordering JSDoc | ✓ VERIFIED | `Scorecard.pipeline: TimingStat` (line 198) documented as PRIMARY compute with explicit stage ordering (lines 180-213). |
| `data/measure/README.md` | heap protocol + render hardening documented | ✓ VERIFIED | Empty-baseline-first heap methodology, N=50000 median-of-5 calibration, provider hooks, render page-visibility hardening + foreground operating note all present (lines 67-172). |
| `../toolbox/.../DataLabModel.ts` | reload/clear provider hooks; Pipeline comparison rows | ✓ VERIFIED | `clearAsync`/`reloadSnapshotAsync` hooks wired (lines 305-311); Pipeline median + p95 are the first two comparison rows (lines 399-404). |
| `../toolbox/.../DataLabPanel.ts` | Pipeline as primary scorecard row | ✓ VERIFIED | `Pipeline (cube + view)` rendered FIRST, Compute reframed as `(genTransaction, grid relay)` (lines 196-203). |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| MeasurementHarness.runIterationAsync | BoundaryInstrumentation.measurePipeline | `await measurePipeline(this, {applyDiffAsync: () => adapter.applyDiffAsync(batch), ...})` | ✓ WIRED | MeasurementHarness.ts:293; result reduced into `Scorecard.pipeline`. |
| MeasurementHarness.runScenarioAsync | HeapAttribution.captureEmptyBaselineHeapAsync | `clearPipelineAsync()` then `captureEmptyBaselineHeapAsync(gcSettleMs)` before snapshot reload | ✓ WIRED | MeasurementHarness.ts:163-164; baseline threaded into `attributeHeap` per iteration. |
| MeasurementHarness.runScenarioAsync | reloadSnapshotAsync (provider) | called AFTER `calibrateAsync`, before protocol (18d339e70 fix) | ✓ WIRED | MeasurementHarness.ts:178; DataLabModel binds it to `adapter.loadSnapshotAsync(snapshotRows)` (line 309). Confirms measured run uses full scenario. |
| BaselineAdapter View query | Cube hierarchy | `includeLeaves: true` + `treeMode` grid | ✓ WIRED | BaselineAdapter.ts:281-288; live counts confirm leaves materialize under aggregates. |
| measureGridSync | nextRenderFrameAsync | `{suspect}` from visibilityState + timeout race | ✓ WIRED | BoundaryInstrumentation.ts:223,238; `renderSuspect` flows into `GridSyncTiming`. |
| DataLabPanel scorecard | Scorecard.pipeline | `timingRow('Pipeline (cube + view)', [fmtMs(sc.pipeline.medianMs), ...])` rendered first | ✓ WIRED | DataLabPanel.ts:196-199. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| HARN-01 | 02-07 | Configurable dataset generator + realistic large-leaf-plus-aggregate shapes | ✓ SATISFIED | treeMode + includeLeaves:true; live 5000/5587 tree (Truth 1). |
| HARN-02 | (prior plans) | Update generator: pattern, breadth, throughput, transport | ✓ SATISFIED | Already verified; regression-checked (Truth 2). |
| HARN-03 | 02-07 | OTel boundary instrumentation, bounded/documented overhead | ✓ SATISFIED | `runner().span` structure + `performance.now()` number; `measureOverhead` reports overheadMs; pipeline span wired (Truth 4). |
| HARN-04 | 02-08 | Heap by layer, non-COI fallback | ✓ SATISFIED | performanceMemory path, fixed empty baseline, positive total + plausible layers (Truth 3). |
| HARN-05 | 02-07, 02-08 | Compute vs bridge separation, median+p95 forced-GC protocol | ✓ SATISFIED | pipeline/compute/bridge/render TimingStats; forced-GC between iterations; render hardening (Truths 3,4). |
| HARN-06 | 02-08 | Reusable, config-driven, documented for baseline AND candidate | ✓ SATISFIED | CandidateAdapter seam, FormModel/ViewManager config, README protocol doc (Truth 5). |

No orphaned requirements: REQUIREMENTS.md maps exactly HARN-01..06 to Phase 2, all marked Complete, all accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (none) | - | No TODO/FIXME/placeholder/stub returns found in the gap-closure files | - | All artifacts are substantive and wired; no degenerate returns remain. |

The prior `Math.max(0, ...)` floors in calibration (HeapAttribution.ts:163) and remainder (line 207) are intentional, documented noise-floor handling - not stubs.

### Human Verification Required

None required for goal closure - the orchestrator already LIVE-VERIFIED all three gap-closure outcomes in flagged Chrome (`--js-flags=--expose-gc --enable-precise-memory-info`, performanceMemory, COI false, 5000-leaf/3-dim default). The static code cross-check in this pass confirms the codebase contains every mechanism the live evidence attributes the results to.

For ongoing operation (not blocking): keep the measurement tab FOREGROUNDED during runs (documented README operating note) so the deferred-render metric is not flagged `renderSuspect`.

### Gaps Summary

All three gaps from the initial verification are closed and corroborated by both the live evidence and the static code:

- **Gap 1 (pipeline timing, HARN-03/05):** `measurePipeline` is wired into `runIterationAsync` as the primary compute ahead of the grid-sync relay; the scorecard surfaces it first. Live 58.1 ms vs 0.6 ms relay confirms the engine cost is now measured.
- **Gap 2 (tree shape, HARN-01):** `treeMode` + unconditional `includeLeaves: true` + `store.allCount` accessors materialize a real large-leaf-plus-aggregate tree. Live 5000/5587/5587 counts with chevrons confirm.
- **Gap 3 (heap protocol, HARN-04/05):** A fixed clean post-GC empty-pipeline baseline (captured before snapshot load, restored after calibration via `reloadSnapshotAsync`) plus N=50000 median-of-5 calibration produce a positive +78.8 MB total with non-negative, summing per-layer footprints.

Residual design note (NOT a gap, accepted and documented): calibration shares the measured adapter, which is why `reloadSnapshotAsync` must run after `calibrateAsync` (handled by the `18d339e70` fix). A future hardening could give calibration an isolated pipeline. This does not block Phase 3.

The harness now fulfills its core charter: it measures the right work (cube+view pipeline) against the right shape (large-leaf-plus-aggregate tree) with trustworthy, layer-attributed heap - durable infrastructure ready to adjudicate every later faster/lighter claim.

---

_Verified: 2026-06-29T21:30:00Z_
_Verifier: Claude (gsd-verifier, re-verification - static code cross-check against orchestrator live evidence)_
