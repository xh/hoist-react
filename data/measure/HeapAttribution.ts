/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';
import {median} from './MeasurementProtocol';
import {HeapAttribution, HeapMethod} from './types';

/**
 * Heap-attribution layer for the measurement harness (HARN-04).
 *
 * This is the no-cross-origin-isolation (no-COI) PRIMARY path by design: it reads whole-heap usage
 * via the non-standard `performance.memory.usedJSHeapSize` (the existing Hoist precedent - see
 * `InspectorService`) and attributes that heap to the owned Hoist layers (cube store records, grid
 * store records, intermediate view-result rows) by `count x measured-per-record-bytes`. AG Grid's
 * internal memory is treated as the OPAQUE REMAINDER (total delta minus owned layers) and is never
 * read from AG Grid source.
 *
 * The precise COI API (`measureUserAgentSpecificMemory`) is intentionally NOT implemented here per
 * Phase-2 CONTEXT: it requires cross-origin isolation, adds complexity, and does not even produce a
 * Hoist-layer breakdown - so it is deferred unless trivial. Only the no-COI accounting path lives here.
 *
 * Caveats baked into every reading produced here:
 * - `performance.memory` reports the V8 JS heap only. Real renderer-process RAM is typically 2-4x
 *   larger, so outputs must be labeled "V8 heap" and never presented as total process memory.
 * - `usedJSHeapSize` is quantized to ~100KB buckets unless Chrome runs with
 *   `--enable-precise-memory-info` (Pitfall 3). That flag belongs in the documented run flags and is
 *   recorded in env metadata (`EnvMetadata.preciseMemory`); without it, small deltas are noise.
 * - `window.gc()` requires Chrome launched with `--js-flags=--expose-gc` and is best-effort/async-ish
 *   (Pitfall 5) - a settle delay after the call is mandatory before reading the heap.
 */

/**
 * Augments `Performance` with the non-standard Chromium `memory` property. Mirrors the private
 * interface in `InspectorService` (which is not exported, so it is redeclared here rather than
 * imported); shape kept identical so both read the same fields.
 */
interface NonStandardPerformance extends Performance {
    memory?: {
        totalJSHeapSize: number;
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}

/**
 * Read the current whole-heap usage (V8 JS heap) via `performance.memory.usedJSHeapSize`. No
 * cross-origin isolation required. Returns null when `performance.memory` is unavailable (non-Chromium
 * browsers, or Chromium without the feature).
 */
export function heapNow(): number | null {
    return (window.performance as NonStandardPerformance)?.memory?.usedJSHeapSize ?? null;
}

/**
 * Force a garbage collection (best-effort) and then settle before the caller reads the heap.
 *
 * `window.gc()` is only present when Chrome is launched with `--js-flags=--expose-gc`; when absent
 * this is a no-op GC and only the settle delay applies. GC is best-effort and somewhat asynchronous
 * (Pitfall 5), so we invoke it twice and always await a settle delay before any heap read.
 *
 * @param settleMs - delay (ms) to wait after forcing GC before the heap is considered stable.
 */
export async function forceGcAndSettleAsync(settleMs: number): Promise<void> {
    // `gc` is not on the standard Window type - accessed via index, matching existing Hoist usage.
    const gc = window['gc'] as (() => void) | undefined;
    // Best-effort: call twice (GC is async-ish; a second pass collects what the first freed).
    gc?.();
    gc?.();
    await wait(settleMs);
}

/**
 * Capture the clean post-GC EMPTY-pipeline baseline heap reading the harness differences every
 * iteration's total against.
 *
 * The caller MUST have emptied the live pipeline to a true-empty state (e.g. via
 * `BaselineAdapter.clearPipelineAsync` -> `Cube.clearAsync`, which re-aggregates the connected View
 * to empty and clears the grid store) BEFORE calling this. This forces a GC + settle so the reading
 * is post-GC steady state, then returns `heapNow()`. That FIXED reference is then passed to every
 * {@link attributeHeap} call so the reported total is positive retained heap, not the inverted
 * within-iteration pre/post-GC delta (which read -28.2 MB before this fix).
 *
 * @param settleMs - the forced-GC settle delay (ms) applied before the baseline heap read.
 * @returns the post-GC empty-pipeline `heapNow()` reading (0 when `performance.memory` is absent).
 */
export async function captureEmptyBaselineHeapAsync(settleMs: number): Promise<number> {
    await forceGcAndSettleAsync(settleMs);
    return heapNow() ?? 0;
}

/**
 * Detect the heap-attribution method in use. This plan implements ONLY the no-COI default, so it
 * always reports `performanceMemory`. The COI `measureUserAgentSpecificMemory` path is intentionally
 * not implemented here (deferred per CONTEXT; it requires cross-origin isolation and does not yield a
 * Hoist-layer breakdown). Recorded in env metadata so saved scorecards note how heap was measured.
 */
export function detectHeapMethod(): HeapMethod {
    return 'performanceMemory';
}

/**
 * Measure the per-record byte cost of a single layer by a dedicated load-N-and-divide run:
 * settle the heap, read a baseline, load `n` rows, settle again, read the heap, and return the
 * delta divided by `n`.
 *
 * MUST be run once per distinct field-shape. Object-valued-field shapes get their own measurement
 * run because a shared object referenced by many records makes a naive `count x per-record-bytes`
 * double-count the shared bytes (RESEARCH Open Question 1). The harness reports which run produced
 * each per-record figure in the scorecard so the accounting is auditable.
 *
 * The `args` object carries the sizing callbacks and counts: `loadNRowsAsync` loads exactly `n`
 * rows of the layer being measured; `clearAsync` tears those rows back down so the run leaves no
 * residual heap; `n` is the number of rows in the sample; `repeats` is how many load-N/clear cycles
 * to run before taking the MEDIAN per-record figure; and `settleMs` is the forced-GC settle delay
 * (ms) applied before each heap read.
 *
 * LARGER-N + MEDIAN-OF-REPEATS RATIONALE (defaults `n = 50000`, `repeats = 5`): a single small
 * 1000-row diff is sub-noise against the documented tens-of-MB GC/heap variance on a ~366 MB live
 * heap, so it read 0 even under the flags. 50000 rows is 10x the default 5000-leaf scenario, so the
 * sizing load itself moves a clearly tens-of-MB delta that CLEARS that variance, and the median
 * over 5 repeats rejects a single mistimed GC. These are deliberately NOT a "sane larger N": the
 * committed per-sample floor-at-0 below means an under-resolved load silently reads 0 again - the
 * exact failure this closes - so the load must be measurably large.
 *
 * Each per-cycle sample is floored at 0: a per-record byte cost cannot be negative, so a negative raw
 * delta (the post-load heap reading lower than the baseline) is measurement noise - a GC firing
 * mid-load, or `performance.memory` quantization without `--enable-precise-memory-info` - not a real
 * negative footprint. Flooring keeps the downstream `count x perRecordBytes` layer figures
 * non-negative; the MEDIAN is then taken over the floored samples.
 *
 * @returns the median over `repeats` cycles of `max(0, (afterHeap - beforeHeap) / n)`.
 */
export async function measurePerRecordBytesAsync(args: {
    loadNRowsAsync: (n: number) => Promise<void>;
    clearAsync: () => Promise<void>;
    n?: number;
    repeats?: number;
    settleMs: number;
}): Promise<number> {
    const {loadNRowsAsync, clearAsync, settleMs} = args,
        n = args.n ?? 50000,
        repeats = args.repeats ?? 5;

    if (n <= 0 || repeats <= 0) return 0;

    const samples: number[] = [];
    for (let i = 0; i < repeats; i++) {
        await forceGcAndSettleAsync(settleMs);
        const before = heapNow() ?? 0;

        await loadNRowsAsync(n);
        await forceGcAndSettleAsync(settleMs);
        const after = heapNow() ?? 0;

        // Clean up so each cycle leaves no residual heap for the next repeat.
        await clearAsync();

        samples.push(Math.max(0, (after - before) / n));
    }

    // Median over the repeats rejects a single mistimed GC; reuse the protocol's median (not a dupe).
    return median(samples);
}

/**
 * Attribute the current whole-heap delta to the owned Hoist layers, with AG Grid internals as the
 * opaque remainder. Pure and synchronous: it reads `heapNow()` and computes - the CALLER is
 * responsible for calling {@link forceGcAndSettleAsync} immediately before invoking this, so the
 * current heap read is post-GC steady state. Keeping the read-and-compute pure makes it
 * deterministic and testable.
 *
 * TOTAL = RETAINED HEAP vs. THE FIXED EMPTY BASELINE. `totalHeapDelta` is the current post-GC heap
 * minus `emptyBaselineHeap` - the clean post-GC reading captured on the EMPTY pipeline before any
 * data was loaded (see {@link captureEmptyBaselineHeapAsync}). Because both ends are post-GC and the
 * baseline is the truly-empty floor, the total is POSITIVE retained heap. This fixes the observed
 * -28.2 MB inversion, which came from differencing the post-GC current read against a within-iteration
 * PRE-GC `baselineHeap` (so the "total" measured how much the forced GC freed and went negative).
 *
 * Each owned layer = its live row count x its measured per-record bytes. `agGridInternals` is the
 * OPAQUE REMAINDER: `max(0, totalDelta - sumOfOwnedLayers)`. AG Grid's internal node/cell sizes are
 * library-owned and opaque (Phase-1) and are measured ONLY as this remainder - they are NEVER read
 * from AG Grid source, which is the documented anti-pattern. The remainder is floored at 0 because
 * heap quantization/noise can make the owned sum momentarily exceed the measured delta.
 *
 * @returns a {@link HeapAttribution} (the 02-01 type) with all four layers, total delta, unit, method.
 */
export function attributeHeap(ctx: {
    emptyBaselineHeap: number;
    cubeRecordCount: number;
    gridRecordCount: number;
    viewRowCount: number;
    sizing: {cubeRecordBytes: number; gridRecordBytes: number; viewRowBytes: number};
    method: HeapMethod;
}): HeapAttribution {
    const {emptyBaselineHeap, cubeRecordCount, gridRecordCount, viewRowCount, sizing, method} = ctx,
        totalHeapDelta = (heapNow() ?? emptyBaselineHeap) - emptyBaselineHeap,
        cubeStoreRecords = cubeRecordCount * sizing.cubeRecordBytes,
        gridStoreRecords = gridRecordCount * sizing.gridRecordBytes,
        viewResultRows = viewRowCount * sizing.viewRowBytes,
        ownedSum = cubeStoreRecords + gridStoreRecords + viewResultRows,
        agGridInternals = Math.max(0, totalHeapDelta - ownedSum);

    return {
        cubeStoreRecords,
        gridStoreRecords,
        viewResultRows,
        agGridInternals,
        totalHeapDelta,
        unit: 'bytes',
        method
    };
}
