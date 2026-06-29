/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';
import {HeapAttribution, HeapMethod} from './types';

/**
 * Heap-attribution layer for the measurement harness (HARN-04).
 *
 * This is the no-cross-origin-isolation (no-COI) PRIMARY path by design: it reads whole-heap usage
 * via the non-standard `performance.memory.usedJSHeapSize` (the existing Hoist precedent - see
 * `InspectorService`) and attributes that heap to the owned Hoist layers (cube store records, grid
 * store records, intermediate view-result rows) by `count x calibrated-per-record-bytes`. AG Grid's
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
 * Detect the heap-attribution method in use. This plan implements ONLY the no-COI default, so it
 * always reports `performanceMemory`. The COI `measureUserAgentSpecificMemory` path is intentionally
 * not implemented here (deferred per CONTEXT; it requires cross-origin isolation and does not yield a
 * Hoist-layer breakdown). Recorded in env metadata so saved scorecards note how heap was measured.
 */
export function detectHeapMethod(): HeapMethod {
    return 'performanceMemory';
}

/**
 * Calibrate the per-record byte cost of a single layer by a dedicated load-N-and-divide run:
 * settle the heap, read a baseline, load `n` rows, settle again, read the heap, and return the
 * delta divided by `n`.
 *
 * Calibration MUST be run once per distinct field-shape. Object-valued-field shapes get their own
 * calibration run because a shared object referenced by many records makes a naive
 * `count x per-record-bytes` double-count the shared bytes (RESEARCH Open Question 1). The harness
 * reports which calibration produced each per-record figure in the scorecard so the accounting is
 * auditable.
 *
 * The `args` object carries the calibration callbacks and counts: `loadNRowsAsync` loads exactly
 * `n` rows of the layer being calibrated; `clearAsync` tears those rows back down so the run leaves
 * no residual heap; `n` is the number of rows in the sample (a larger `n` dampens quantization
 * noise); and `settleMs` is the forced-GC settle delay (ms) applied before each heap read.
 *
 * The result is floored at 0: a per-record byte cost cannot be negative, so a negative raw delta
 * (the post-load heap reading lower than the baseline) is measurement noise - a GC firing mid-load,
 * or `performance.memory` quantization without `--enable-precise-memory-info` - not a real negative
 * footprint. Returning 0 there keeps the downstream `count x perRecordBytes` layer figures
 * non-negative (the prior behavior multiplied a negative cost by thousands of rows, surfacing
 * impossible results like a -89 MB layer and a correspondingly inflated AG Grid remainder).
 *
 * @returns per-record byte cost `max(0, (afterHeap - beforeHeap) / n)` for this field-shape.
 */
export async function calibratePerRecordBytesAsync(args: {
    loadNRowsAsync: (n: number) => Promise<void>;
    clearAsync: () => Promise<void>;
    n: number;
    settleMs: number;
}): Promise<number> {
    const {loadNRowsAsync, clearAsync, n, settleMs} = args;

    await forceGcAndSettleAsync(settleMs);
    const before = heapNow() ?? 0;

    await loadNRowsAsync(n);
    await forceGcAndSettleAsync(settleMs);
    const after = heapNow() ?? 0;

    // Clean up so the calibration leaves no residual heap for subsequent runs.
    await clearAsync();

    return n > 0 ? Math.max(0, (after - before) / n) : 0;
}

/**
 * Attribute the current whole-heap delta to the owned Hoist layers, with AG Grid internals as the
 * opaque remainder. Pure and synchronous: it reads `heapNow()` and computes - the CALLER is
 * responsible for calling {@link forceGcAndSettleAsync} immediately before invoking this, so the
 * heap read is stable. Keeping the read-and-compute pure makes it deterministic and testable.
 *
 * Each owned layer = its live row count x its calibrated per-record bytes. `agGridInternals` is the
 * OPAQUE REMAINDER: `max(0, totalDelta - sumOfOwnedLayers)`. AG Grid's internal node/cell sizes are
 * library-owned and opaque (Phase-1) and are measured ONLY as this remainder - they are NEVER read
 * from AG Grid source, which is the documented anti-pattern. The remainder is floored at 0 because
 * heap quantization/noise can make the owned sum momentarily exceed the measured delta.
 *
 * @returns a {@link HeapAttribution} (the 02-01 type) with all four layers, total delta, unit, method.
 */
export function attributeHeap(ctx: {
    baselineHeap: number;
    cubeRecordCount: number;
    gridRecordCount: number;
    viewRowCount: number;
    calibration: {cubeRecordBytes: number; gridRecordBytes: number; viewRowBytes: number};
    method: HeapMethod;
}): HeapAttribution {
    const {baselineHeap, cubeRecordCount, gridRecordCount, viewRowCount, calibration, method} = ctx,
        totalHeapDelta = (heapNow() ?? baselineHeap) - baselineHeap,
        cubeStoreRecords = cubeRecordCount * calibration.cubeRecordBytes,
        gridStoreRecords = gridRecordCount * calibration.gridRecordBytes,
        viewResultRows = viewRowCount * calibration.viewRowBytes,
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
