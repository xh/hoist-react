/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {wait} from '@xh/hoist/promise';
import {HeapMethod} from './types';

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
