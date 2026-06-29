---
phase: 02-measurement-harness
plan: 04
subsystem: data
tags: [measurement, harness, heap, performance-memory, attribution, ag-grid, no-coi]

# Dependency graph
requires:
  - phase: 02-measurement-harness
    provides: "HeapAttribution / HeapMethod output types (02-01); the data/measure barrel"
provides:
  - "heapNow(): whole-heap read via performance.memory.usedJSHeapSize (no cross-origin isolation)"
  - "forceGcAndSettleAsync(settleMs): best-effort window.gc() + mandatory settle before a heap read"
  - "detectHeapMethod(): reports the no-COI 'performanceMemory' method for env metadata"
  - "calibratePerRecordBytesAsync(): per-field-shape load-N-and-divide per-record byte calibration"
  - "attributeHeap(): pure layered attribution with AG Grid internals as the floored opaque remainder"
affects: [02-05, 02-06, heap-attribution, measurement-protocol, toolbox-harness-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "No-COI heap accounting as PRIMARY path: owned layers by count x calibrated bytes, AG Grid as remainder"
    - "Forced-GC + settle precedes every heap read (GC is best-effort/async); method recorded in env metadata"
    - "attributeHeap stays pure/synchronous (read + compute); caller owns the GC/settle so it is deterministic/testable"

key-files:
  created:
    - data/measure/HeapAttribution.ts
  modified:
    - data/measure/index.ts

key-decisions:
  - "Redeclared a local NonStandardPerformance interface matching the InspectorService precedent - it is private (not exported), so it cannot be imported"
  - "forceGcAndSettleAsync calls window['gc']() twice (best-effort, GC is async-ish) then awaits Hoist wait(settleMs)"
  - "agGridInternals floored at 0 via Math.max(0, totalDelta - ownedSum) so heap quantization/noise cannot produce a negative remainder"
  - "COI measureUserAgentSpecificMemory path intentionally NOT implemented (deferred per CONTEXT; no Hoist-layer breakdown)"

patterns-established:
  - "Per-field-shape calibration: object-valued fields get their own run to avoid double-counting shared object references (RESEARCH Open Q1)"
  - "AG Grid memory measured only as the opaque remainder, never read from AG Grid source (Phase-1 anti-pattern)"

requirements-completed: [HARN-04]

# Metrics
duration: 3min
completed: 2026-06-29
---

# Phase 2 Plan 04: Heap Attribution Layer Summary

**No-cross-origin-isolation heap attribution that reads V8 whole-heap via `performance.memory.usedJSHeapSize`, calibrates per-record byte cost per field-shape, and splits resident heap into cube/grid/view owned layers with AG Grid internals as the opaque remainder (HARN-04).**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-29T16:59:35Z
- **Completed:** 2026-06-29T17:02:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built the no-COI whole-heap primitives: `heapNow()` (reads `usedJSHeapSize`, null when unavailable) and `forceGcAndSettleAsync()` (best-effort `window.gc()` x2 + mandatory `wait(settleMs)` settle), reusing the existing Hoist `performance.memory` precedent rather than inventing a new probe
- `detectHeapMethod()` reports the no-COI `performanceMemory` method for env metadata; documented that the COI `measureUserAgentSpecificMemory` path is intentionally absent
- `calibratePerRecordBytesAsync()` derives per-record bytes by a dedicated load-N-and-divide run, calibrated per field-shape (object-valued fields get their own run to avoid double-counting shared references)
- `attributeHeap()` returns the 02-01 `HeapAttribution` type - cube/grid/view owned layers by count x calibrated bytes, with `agGridInternals = Math.max(0, totalDelta - ownedSum)` as the floored opaque remainder; kept pure/synchronous so the caller owns the GC/settle
- Documented V8-heap-only (real RAM 2-4x) and ~100KB quantization (`--enable-precise-memory-info`) caveats at the file head

## Helper Signatures (for the 02-05 orchestrator)

Importable from `@xh/hoist/data`:

- `heapNow(): number | null` - current V8 heap usage in bytes, or null if `performance.memory` is unavailable.
- `forceGcAndSettleAsync(settleMs: number): Promise<void>` - force GC (best-effort) then settle; call before every heap read.
- `detectHeapMethod(): HeapMethod` - always `'performanceMemory'` (no-COI default), stamped into `EnvMetadata.heapMethod`.
- `calibratePerRecordBytesAsync(args: {loadNRowsAsync: (n) => Promise<void>; clearAsync: () => Promise<void>; n: number; settleMs: number}): Promise<number>` - returns `(after - before) / n`.
- `attributeHeap(ctx: {baselineHeap; cubeRecordCount; gridRecordCount; viewRowCount; calibration: {cubeRecordBytes; gridRecordBytes; viewRowBytes}; method}): HeapAttribution`.

## Calibration contract the orchestrator (02-05) must satisfy

For each layer (cube store records, grid store records, view-result rows) and for each distinct field-shape (including the object-valued-field variant), the orchestrator must supply:
- `loadNRowsAsync(n)` - load exactly `n` rows of that layer/shape into the live pipeline.
- `clearAsync()` - tear those rows back down so the calibration leaves no residual heap.

It then calls `calibratePerRecordBytesAsync` once per layer/shape to populate the `calibration` object, captures a baseline via `heapNow()` after a `forceGcAndSettleAsync`, runs the scenario, calls `forceGcAndSettleAsync` again, and finally calls `attributeHeap` (pure read + compute) to produce the `HeapAttribution`.

## NonStandardPerformance reuse

The existing Hoist `NonStandardPerformance` interface lives privately inside `svc/InspectorService.ts` (not exported), so it could NOT be imported. A matching interface was **redeclared** locally in `HeapAttribution.ts` with the identical `memory?: {totalJSHeapSize; usedJSHeapSize; jsHeapSizeLimit}` shape. The `window.gc()` access uses `window['gc']` indexed access, matching the existing precedent in `desktop/appcontainer/VersionBar.ts`.

## Task Commits

1. **Task 1: Whole-heap read + forced-GC settle primitives** - `c74afe83b` (feat)
2. **Task 2: Per-record calibration + layered attribution** - committed in `6ca2ccd61` (see Deviations)

## Files Created/Modified
- `data/measure/HeapAttribution.ts` - the full no-COI heap-attribution layer (primitives + calibration + attribution)
- `data/measure/index.ts` - added `export * from './HeapAttribution';` to the measure barrel

## Decisions Made
- Redeclared `NonStandardPerformance` locally (the InspectorService one is private/non-exported)
- `window['gc']()` invoked twice (best-effort, GC is async-ish) then `wait(settleMs)` settle
- `agGridInternals` floored at 0 so quantization/noise cannot yield a negative remainder
- COI `measureUserAgentSpecificMemory` deliberately not implemented (deferred per CONTEXT)

## Deviations from Plan

### Process Deviation - Task 2 commit folded into the concurrent 02-03 commit

- **Found during:** Task 2 commit step
- **Issue:** Plan 02-03 ran concurrently and was committing at the same instant. My Task 2 `git commit` invoked the `lint-staged` pre-commit hook (prettier + eslint), and my staged `HeapAttribution.ts` / `index.ts` changes were swept into 02-03's in-flight commit `6ca2ccd61`. My own `git commit` then reported "nothing to commit".
- **Fix:** None required - the Task 2 code is fully present and correct in the working tree and in commit `6ca2ccd61`. The barrel correctly exports BOTH `./HeapAttribution` (this plan) and `./BoundaryInstrumentation` (02-03), confirming the two concurrent plans cooperated without clobbering each other's barrel edits (the concurrency-safety guidance in the plan notes held).
- **Files affected:** `data/measure/HeapAttribution.ts`, `data/measure/index.ts`
- **Verification:** `npx tsc --noEmit` and `eslint` both pass clean on the committed state; all Task 2 markers (`calibratePerRecordBytesAsync`, `attributeHeap`, `Math.max(0,`) present.

---

**Total deviations:** 1 (process/commit-attribution only; no code or scope impact)
**Impact on plan:** None on functionality - all planned code shipped exactly as specified. Only the commit hash for Task 2 differs (shared with 02-03 due to concurrent execution timing).

## Issues Encountered
- tsdoc linter flagged dotted `@param args.foo` tags as invalid identifiers (same strictness 02-01 hit). Reworded the `calibratePerRecordBytesAsync` doc to describe the `args` fields in prose instead of dotted `@param` tags; re-linted clean. No behavior or scope change.

## User Setup Required
None - no external service configuration required. Pure measurement helpers; runtime behavior is exercised only by the harness orchestrator. (Reproducible heap precision needs Chrome run flags `--js-flags=--expose-gc` and `--enable-precise-memory-info`, which are documented in env metadata, not setup steps for this library plan.)

## Next Phase Readiness
- Heap-attribution layer complete and exported from `@xh/hoist/data`. The 02-05 orchestrator can wire live Cube/Grid/View instances into `loadNRowsAsync`/`clearAsync`, calibrate per layer/shape, and call `attributeHeap` to populate the `Scorecard.heap` field.
- No blockers. The COI path remains intentionally deferred; if a precise breakdown is ever needed it can be added behind `detectHeapMethod` without changing the no-COI contract.

## Self-Check: PASSED

`data/measure/HeapAttribution.ts` present with all helpers; `data/measure/index.ts` exports it; commits `c74afe83b` (Task 1) and `6ca2ccd61` (Task 2, shared with 02-03) both exist in git history; `npx tsc --noEmit` and `eslint` pass on the committed state.

---
*Phase: 02-measurement-harness*
*Completed: 2026-06-29*
