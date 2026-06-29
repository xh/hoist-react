/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';

/**
 * Boundary-instrumentation layer of the measurement core.
 *
 * These helpers wrap the Phase-1 instrumentation boundaries so each can be timed with sub-ms
 * precision while still bubbling into Hoist's existing OTel tooling for trace structure and
 * correlation (HARN-03). The six Phase-1 boundaries this module is built to instrument:
 *
 *   1. Cube ingest               - `Cube.loadDataAsync` / `updateDataAsync`.
 *   2. Cube to view push         - `noteCubeUpdated` re-aggregation.
 *   3. `View.result` ref write   - the `@observable.ref` ViewResult assignment.
 *   4. Store `_filtered` rebuild - the `@observable.ref` RecordSet assignment.
 *   5. Grid sync bridge          - `dataReaction` to `genTransaction` to `applyTransaction`
 *                                  (split into compute / bridge / deferred render below).
 *   6. Heap-attribution layers   - measured in 02-04, not here.
 *
 * THE RULE: spans are for STRUCTURE, `performance.now()` is for the NUMBER.
 *
 * WHY: Hoist's `Span` measures elapsed time with `Date.now()` (epoch ms) - see `Span.startTime` /
 * `Span.end()` in `core/Span.ts`, where `duration = endTime - startTime` is whole-millisecond
 * resolution. That is far too coarse for the sub-ms Hoist-side compute we need to attribute (this
 * is RESEARCH Pitfall 1: relying on `Span.duration` would silently round sub-ms work to 0/1 ms).
 * So every load-bearing number here is captured with `performance.now()` (sub-ms, monotonic) and
 * attached to the span as a tag; the span's own `Date.now()` duration is never read for results.
 *
 * All span and tag names use a consistent `xhDataLab.` prefix.
 */

/** Namespace prefix for every span and timing tag this module emits. */
const PREFIX = 'xhDataLab';

/**
 * Generic boundary timing helper (HARN-03).
 *
 * Wraps `fn` in a `runner().span()` for trace structure / correlation (this is where the
 * measurement bubbles into Hoist's OTel / `TraceService`), while bracketing the actual call with
 * `performance.now()` for the precise elapsed number. The elapsed value is attached to the span as
 * a tag so it rides along with the trace, but the span's own `Date.now()`-based duration is NOT
 * used as the result.
 *
 * @param host - the `HoistBase` whose `runner()` opens the span (supplies caller / namespace).
 * @param name - operation name; combined with the `xhDataLab.` prefix for the span and tag.
 * @param fn   - the boundary work to time (sync or async).
 * @returns the `fn` result plus the precise `performance.now()` elapsed time in ms.
 */
export async function measureBoundary<T>(
    host: HoistBase,
    name: string,
    fn: () => Promise<T> | T
): Promise<{result: T; elapsedMs: number}> {
    return host
        .runner()
        .span(`${PREFIX}.${name}`)
        .run(async ctx => {
            const t0 = performance.now();
            const result = await fn();
            const elapsedMs = performance.now() - t0;

            // Span carries the precise number as a tag - structure from the span, number from
            // performance.now(). The span's own Date.now() duration is deliberately ignored.
            ctx.span?.setTag(`${PREFIX}.elapsedMs`, elapsedMs);

            return {result, elapsedMs};
        });
}

/**
 * Result of {@link measurePipeline}: the cube-ingest + view-re-aggregation cost (Boundaries 1-4),
 * the PRIMARY measured compute, all in ms, all timed with `performance.now()`.
 */
export interface PipelineTiming {
    /**
     * The awaited `applyDiffAsync` cost: `Cube.updateDataAsync` -> connected View re-aggregation
     * (`noteCubeUpdated` -> `generateRows` -> `loadStores`) -> `View.result` write -> Store rebuild.
     * Per the confirmed source, all of this settles within the single awaited ingest call.
     */
    ingestMs: number;
    /** Optional defensive settle/flush after ingest (any trailing reaction); 0 when no hook given. */
    settleMs: number;
    /** Total primary pipeline cost: `ingestMs + settleMs`. */
    totalMs: number;
}

/**
 * Primary pipeline timing (Boundaries 1-4) - the load-bearing HARN-03 / HARN-05 measurement.
 *
 * Times the REAL engine work that `adapter.applyDiffAsync` performs: cube ingest
 * (`Cube.updateDataAsync`), the connected View re-aggregation it awaits, the `View.result`
 * `@observable.ref` write, and the backing Store rebuild. Per the confirmed source,
 * `Cube.updateDataAsync` does `await forEachAsync(connectedViews, v => v.noteCubeUpdated(...))`, and
 * `noteCubeUpdated` synchronously runs `generateRows()` -> `loadStores()` -> `updateResults()`
 * within that await - so bracketing the awaited `applyDiffAsync` with `performance.now()` captures
 * the full Boundaries-1-4 cost. This is the PRIMARY compute number; {@link measureGridSync} times
 * the FINAL grid-sync stage (Boundary 5).
 *
 * Follows the module rule: a `runner().span()` for trace STRUCTURE, `performance.now()` for the
 * NUMBER. The span's own `Date.now()` duration is never read for the result.
 *
 * @param host - the `HoistBase` whose `runner()` opens the span.
 * @param args - injected `applyDiffAsync` (the awaited cube+view work to time), an optional
 *               `settleAsync` defensive flush, and `rowCount` for span tagging.
 * @returns the {@link PipelineTiming} split in ms.
 */
export async function measurePipeline(
    host: HoistBase,
    args: {
        applyDiffAsync: () => Promise<void>;
        settleAsync?: () => Promise<void>;
        rowCount: number;
    }
): Promise<PipelineTiming> {
    const {applyDiffAsync, settleAsync, rowCount} = args;

    return host
        .runner()
        .span(`${PREFIX}.pipeline`)
        .run(async ctx => {
            // PRIMARY: the awaited cube-ingest + connected-View re-aggregation (Boundaries 1-4).
            const t0 = performance.now();
            await applyDiffAsync();
            const t1 = performance.now();

            // Optional defensive settle so any residual async work is captured, not dropped.
            if (settleAsync) await settleAsync();
            const t2 = performance.now();

            const ingestMs = t1 - t0,
                settleMs = settleAsync ? t2 - t1 : 0,
                totalMs = ingestMs + settleMs;

            ctx.span?.setTags({
                [`${PREFIX}.ingestMs`]: ingestMs,
                [`${PREFIX}.settleMs`]: settleMs,
                [`${PREFIX}.rowCount`]: rowCount
            });

            return {ingestMs, settleMs, totalMs};
        });
}

/**
 * Result of {@link measureGridSync}: the Boundary-5 compute / bridge / render split, all in ms,
 * all timed with `performance.now()`.
 */
export interface GridSyncTiming {
    /** Hoist-side compute - `genTransaction()` building the AG Grid transaction. */
    computeMs: number;
    /** Synchronous JS-to-AG-Grid bridge call - `applyTransaction(txn)`. */
    bridgeCallMs: number;
    /** Deferred render/paint landing in a later frame, after the sync bridge call returned. */
    renderMs: number;
}

/**
 * Compute-vs-bridge-vs-render split for Boundary 5 - the load-bearing HARN-05 measurement.
 *
 * Times the three distinct costs of pushing a grid update through the `dataReaction` to
 * `genTransaction` to `applyTransaction` bridge, all under a single `xhDataLab.gridSync` span:
 *
 *   - `computeMs`     - Hoist-side JS building the transaction (`genTransaction`).
 *   - `bridgeCallMs`  - the synchronous, opaque crossing into AG Grid (`applyTransaction`).
 *   - `renderMs`      - the deferred layout/paint AG Grid schedules for a LATER frame. Ignoring
 *                       it undercounts the true bridge cost (RESEARCH Pitfall 4), so we await one
 *                       frame after `applyTransaction` returns and attribute that to render.
 *
 * `genTransaction` and `applyTransaction` are INJECTED callables, so this module stays decoupled
 * from `GridModel` internals - the orchestrator (02-05) supplies the real `genTransaction` and the
 * live `agApi.applyTransaction` from the running grid. GridModel is intentionally not imported.
 *
 * @param host - the `HoistBase` whose `runner()` opens the span.
 * @param args - injected `genTransaction` (compute) + `applyTransaction` (bridge), plus rowCount
 *               for span tagging.
 * @returns the three timing components in ms.
 */
export async function measureGridSync(
    host: HoistBase,
    args: {
        genTransaction: () => unknown;
        applyTransaction: (txn: unknown) => void;
        rowCount: number;
    }
): Promise<GridSyncTiming> {
    const {genTransaction, applyTransaction, rowCount} = args;

    return host
        .runner()
        .span(`${PREFIX}.gridSync`)
        .run(async ctx => {
            const t0 = performance.now();
            const txn = genTransaction(); // Hoist-side COMPUTE
            const t1 = performance.now();

            applyTransaction(txn); // synchronous JS-to-AG-Grid BRIDGE call
            const t2 = performance.now();

            // Render is deferred to a later frame, so we await one frame to capture it. Prefer
            // requestPostAnimationFrame (fires AFTER layout/paint of the frame) when available;
            // fall back to requestAnimationFrame otherwise.
            await nextRenderFrameAsync();
            const t3 = performance.now();

            const computeMs = t1 - t0;
            const bridgeCallMs = t2 - t1;
            const renderMs = t3 - t2;

            ctx.span?.setTags({
                [`${PREFIX}.computeMs`]: computeMs,
                [`${PREFIX}.bridgeCallMs`]: bridgeCallMs,
                [`${PREFIX}.renderMs`]: renderMs,
                [`${PREFIX}.rowCount`]: rowCount
            });

            return {computeMs, bridgeCallMs, renderMs};
        });
}

/**
 * Null-scenario instrumentation overhead probe (HARN-03 "bounded, documented overhead").
 *
 * Runs the full {@link measureBoundary} instrumentation path around an empty `fn` `iterations`
 * times and returns the MEDIAN per-iteration overhead in ms. The harness can report this alongside
 * results, or subtract it, to keep the instrumentation cost bounded and documented.
 *
 * @param host       - the `HoistBase` whose `runner()` opens each probe span.
 * @param iterations - number of null iterations to time.
 * @returns median per-iteration overhead in ms (0 when `iterations` is non-positive).
 */
export async function measureOverhead(host: HoistBase, iterations: number): Promise<number> {
    if (iterations <= 0) return 0;

    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        await measureBoundary(host, 'overheadProbe', () => undefined);
        samples.push(performance.now() - t0);
    }

    return median(samples);
}

//------------------------------------------------------------------------------------------------
// Implementation
//------------------------------------------------------------------------------------------------

/**
 * Resolve after the next render frame. Prefers `requestPostAnimationFrame` (resolves AFTER the
 * frame's layout/paint, so deferred render is fully captured); falls back to
 * `requestAnimationFrame` where the post-frame callback is unavailable.
 */
function nextRenderFrameAsync(): Promise<void> {
    const postRaf = (window as any).requestPostAnimationFrame;
    if (typeof postRaf === 'function') {
        return new Promise<void>(res => postRaf(() => res()));
    }
    return new Promise<void>(res => window.requestAnimationFrame(() => res()));
}

/** Simple median (sort + middle / mean-of-two-middle), no library. */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b),
        mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
