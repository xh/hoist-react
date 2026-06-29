---
phase: 02-measurement-harness
verified: 2026-06-29T19:20:00Z
status: gaps_found
score: 2/5 must-haves verified
gaps:
  - truth: "Compute cost of the data pipeline (cube ingest + view re-aggregation) is measured, separately from bridge cost (HARN-03, HARN-05)."
    status: failed
    reason: "runIterationAsync only times measureGridSync (Boundary 5 - the grid add/update/remove diff). The actual pipeline work - adapter.applyDiffAsync -> Cube.updateDataAsync + the View re-aggregation that produces new aggregate rows (Boundaries 1-4) - runs on the line BEFORE timing starts and is never measured. The reported 'Compute (genTransaction)' is the grid-transaction diff, i.e. the relay tail, not the engine. BoundaryInstrumentation's own header enumerates all six boundaries and ships measureBoundary() to time 1-4, but the orchestrator only wired boundary 5."
    artifacts:
      - path: "data/measure/MeasurementHarness.ts"
        issue: "runIterationAsync calls measureGridSync only; applyDiffAsync (cube ingest + view recompute) is untimed. The connected View updates asynchronously, so capturing the full pipeline cost requires awaiting the View.result settle, not just awaiting cube.updateDataAsync."
      - path: "data/measure/BoundaryInstrumentation.ts"
        issue: "measureBoundary() exists for boundaries 1-4 but is unused; only measureGridSync (boundary 5) is invoked by the harness."
    missing:
      - "Wrap applyDiffAsync with measureBoundary and break it into the real pipeline stages: cube ingest, cube->view re-aggregation / View.result settle (awaited), store rebuild."
      - "Report pipeline compute (cube+view) as the PRIMARY compute metric, with grid-sync (current boundary 5) as the final stage - not the whole story."
      - "Scorecard timing rows extended to cover the pipeline stages (the table header already supports added columns/rows)."
  - truth: "The harness reproduces realistic large-leaf-plus-aggregate shapes - multi-level aggregation with leaves (HARN-01)."
    status: failed
    reason: "BaselineAdapter.buildPipeline creates a flat GridModel (no treeMode) and the View query sets includeLeaves: isEmpty(dimensions), which is FALSE whenever dimensions are configured. So with 3 dimensions only the top aggregate level surfaces (observed live: 5000 leaves collapse to 9 top rows, no children, no leaves). The grid shows flat rows with no expand chevrons. This is a degenerate aggregate, not the large-leaf-plus-aggregate tree HARN-01 requires - so every metric is measured against an unrealistic shape."
    artifacts:
      - path: "data/measure/BaselineAdapter.ts"
        issue: "buildPipeline: plain GridModel (no treeMode/groupBy); View query uses includeLeaves: isEmpty(dimensions) so leaves are excluded under aggregates; getResultRowCount reads only View.result.rows (top level)."
    missing:
      - "Tree-mode GridModel (or grouped store) so the multi-level aggregation is materialized and expandable."
      - "View query that surfaces the full hierarchy with includeLeaves: true so leaf facts sit under the deepest aggregate nodes."
      - "Row-count accessors that reflect the full aggregate hierarchy + leaves, not just the top level - these counts also feed heap attribution."
  - truth: "Heap is attributed by layer with a non-COI fallback, reporting plausible non-negative per-layer footprints under a documented forced-GC protocol (HARN-04, HARN-05)."
    status: partial
    reason: "Two methodology defects, both confirmed live WITH --js-flags=--expose-gc and --enable-precise-memory-info active. (1) Total heap delta is computed within one iteration as (post-GC heap - pre-GC heap), so it measures how much the forced GC freed and goes NEGATIVE (observed -28.2 MB); there is no clean empty-pipeline baseline because the caller pre-loads the snapshot before the harness runs. (2) Per-layer value = recordCount x a single 1000-row calibration diff, which is swamped by tens-of-MB GC/heap variance against a ~366 MB live heap, so every layer reads 0 even with the flags. A stopgap floor (negative -> 0) is already committed (hoist-react ba4b48b21) to stop impossible negative layers, but the underlying attribution is not yet trustworthy."
    artifacts:
      - path: "data/measure/MeasurementHarness.ts"
        issue: "runIterationAsync captures baselineHeap = heapNow() BEFORE forceGcAndSettleAsync, then attributeHeap reads heapNow() AFTER - inverted, yielding a negative total delta. calibrateAsync uses a single calN=1000 sample."
      - path: "data/measure/HeapAttribution.ts"
        issue: "calibratePerRecordBytesAsync single-sample differential is below the noise floor; attributeHeap has no clean empty baseline to difference against."
    missing:
      - "Capture a clean post-GC empty-pipeline baseline BEFORE the snapshot loads (contract tweak: caller supplies it, or the harness drives an empty->loaded measurement); compute total retained heap against that fixed reference."
      - "Sturdier per-layer attribution: larger-N + median-of-repeats calibration on a dedicated empty pipeline, or a load-vs-teardown differential per layer."
      - "Re-verify live under the documented Chrome flags - layers should be positive and sum sensibly vs the total."
---

# Phase 2: Measurement Harness Verification Report

**Phase Goal:** Build the reusable, configurable, OTel-instrumented harness that is the sole adjudicator of every later "faster/lighter" claim - parameterizing result shape, update pattern, and transport; separating compute cost from bridge cost; and attributing heap by layer with a non-isolated fallback.
**Verified:** 2026-06-29T19:20:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification (performed via live browser testing of the Data Lab harness with the documented measurement Chrome flags active)

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Dataset generator parameterizes shape AND reproduces realistic large-leaf-plus-aggregate shapes (HARN-01) | ✗ FAILED | Generator parameterization works (leaf/dim/field counts honored, mixed field types incl. object-valued confirmed via live `dataLab/snapshot`). But the harness runs a flat, top-level-only aggregate (5000 -> 9 rows, no tree, no leaves) - it never exercises a realistic large-leaf-plus-aggregate shape. |
| 2   | Update generator parameterizes pattern, breadth, throughput, and transport (HARN-02) | ✓ VERIFIED | HTTP + WebSocket transports live (server `dataLab/diff`, `xhDataLab/updates`); scenario knobs (pattern, batchSize, breadth) drive the update stream. |
| 3   | Heap attributed by layer with non-COI fallback (HARN-04) | ✗ FAILED | Per-layer attribution is noise-swamped (reads 0) and total delta goes negative (-28.2 MB) even with the flags. Methodology defect, not just degraded environment. |
| 4   | Compute cost separated from bridge cost at boundaries, median+p95 under forced-GC protocol (HARN-03, HARN-05) | ✗ FAILED | Only the grid-sync tail (Boundary 5) is timed. The cube-ingest + view-re-aggregation pipeline (Boundaries 1-4) is unmeasured, so the reported "compute" is not the engine cost the harness exists to adjudicate. |
| 5   | Config-driven, documented, reusable for BOTH baseline and candidate evaluation (HARN-06) | ✓ VERIFIED | Config-driven via FormModel + ViewManager profiles; `data/measure/README.md` documents the split architecture; `CandidateAdapter` seam + `BaselineAdapter` confirm reuse. |

**Score:** 2/5 truths verified

### Gaps Summary

The harness is structurally complete and its peripheral machinery (transports, config/persistence, candidate seam, scorecard UI) works. But it does not yet fulfill its core charter: it measures the wrong compute (the grid-relay diff, not the cube/view pipeline) against an unrealistic data shape (a flat top-level aggregate, not a large-leaf-plus-aggregate tree), and its heap attribution is not trustworthy (negative total, zero layers) even under the documented Chrome flags. These are goal-level misses - tasks were completed but the goal was not achieved. They were surfaced by live browser testing of the Data Lab example, which the structural plan-check and the (skipped/auto-approved) verification did not exercise.

The three gaps are interdependent and should be closed as one coherent rework of the measurement core: fixing the data shape (gap 2) changes the cube/aggregate/grid record counts that feed heap attribution (gap 3), and timing the real pipeline (gap 1) is the headline correctness fix. Recommend tackling in order: pipeline timing -> realistic tree shape -> heap protocol, verifying each live against the flagged Chrome.

---

_Verified: 2026-06-29T19:20:00Z_
_Verifier: Claude (live browser verification, in lieu of gsd-verifier auto-run which was auto-approved during --auto execution)_
