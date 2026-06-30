/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {MeasurementProgressFn, ProtocolConfig, TimingStat} from './types';

/**
 * Measurement-protocol engine of the harness core (HARN-05).
 *
 * Implements the steady-state iteration protocol every scenario runs under so reported numbers are
 * reproducible rather than first-call artifacts:
 *
 *   1. Warmup-discard - a configurable number of iterations are run and their samples DISCARDED.
 *      This is RESEARCH Pitfall 6: the FIRST grid update after mount is a full row-data replace, not
 *      an incremental transaction, and the V8 JIT, lazy allocations, and internal caches are still
 *      cold. Measuring those would conflate one-time setup cost with steady-state update cost. The
 *      caller's `setupAsync` is responsible for mounting/warming the grid; the warmup iterations then
 *      drive the pipeline into its incremental-transaction steady state before measurement begins.
 *   2. Forced-GC + settle BETWEEN every measured iteration (`betweenIterationsAsync`) so each measured
 *      sample starts from a clean, settled heap and is not skewed by a GC that happens to fire mid-run.
 *   3. N measured iterations, each sample collected, then reduced to median + p95.
 *
 * Median + p95 (not mean) are reported because update-pipeline timings are right-skewed - the
 * occasional GC pause or layout thrash produces a long tail that a mean would smear across every
 * result. Median captures the typical cost; p95 captures the tail the user actually feels. Both are
 * computed directly (sort + index) with no statistics library, per RESEARCH.
 *
 * This module is engine- and scenario-agnostic: it knows nothing about Cube, AG Grid, heap, or
 * endpoints. It takes injected `setupAsync` / `runIterationAsync` / `betweenIterationsAsync`
 * callbacks and a {@link ProtocolConfig}, and returns the raw measured samples. The orchestrator
 * (`MeasurementHarness`) wires the real work behind those callbacks.
 */

/**
 * Run the warmup-discard / forced-GC-between / measured-iterations protocol.
 *
 * Calls `setupAsync` once, runs `protocol.warmupIterations` warmup iterations (samples discarded),
 * then runs `protocol.measuredIterations` measured iterations - calling `betweenIterationsAsync`
 * (the forced-GC + settle hook) before EACH measured iteration - collecting one sample per measured
 * iteration. Returns the array of measured samples (the caller reduces them per-field).
 *
 * The generic `S` is the per-iteration sample shape (e.g. the orchestrator collects a
 * `{compute, bridge, render, heap}` tuple). This module never inspects `S` - it only collects.
 *
 * The `args` object carries: `protocol` (the warmup/measured/settle counts, persisted with the run);
 * `setupAsync` (one-time mount/warm, run before any iteration); `runIterationAsync` (one full
 * iteration, producing a sample); and `betweenIterationsAsync` (forced GC + settle, run before each
 * measured iteration so every measured sample starts from a settled heap).
 *
 * @returns the array of measured samples (length `protocol.measuredIterations`).
 */
export async function runProtocolAsync<S>(args: {
    protocol: ProtocolConfig;
    setupAsync: () => Promise<void>;
    runIterationAsync: () => Promise<S>;
    betweenIterationsAsync: () => Promise<void>;
    onProgress?: MeasurementProgressFn;
}): Promise<S[]> {
    const {protocol, setupAsync, runIterationAsync, betweenIterationsAsync, onProgress} = args,
        {warmupIterations, measuredIterations} = protocol;

    // One-time setup: caller mounts + warms the grid so we don't measure a cold remount full-replace.
    await setupAsync();

    // Warmup iterations - run for JIT warmup / lazy alloc / cache fill, samples DISCARDED.
    for (let i = 0; i < warmupIterations; i++) {
        onProgress?.({stage: 'Warming up', current: i + 1, total: warmupIterations});
        await runIterationAsync();
    }

    // Measured iterations - forced-GC + settle BEFORE each, then collect the sample.
    const samples: S[] = [];
    for (let i = 0; i < measuredIterations; i++) {
        onProgress?.({stage: 'Measuring', current: i + 1, total: measuredIterations});
        await betweenIterationsAsync();
        samples.push(await runIterationAsync());
    }

    return samples;
}

//------------------------------------------------------------------------------------------------
// Pure stats helpers (no library - computed directly per RESEARCH)
//------------------------------------------------------------------------------------------------

/**
 * Median of a numeric sample (sort + middle; mean-of-two-middle for even counts). Returns 0 for an
 * empty sample. Does not mutate the input.
 */
export function median(xs: number[]): number {
    if (xs.length === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b),
        mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 95th percentile of a numeric sample via the nearest-rank method (sort, then index at
 * `ceil(0.95 * n) - 1`, clamped into range). Returns 0 for an empty sample. The p95 captures the
 * long-tail cost (the GC pause / layout thrash the user feels) that a median smooths away. Does not
 * mutate the input.
 */
export function p95(xs: number[]): number {
    if (xs.length === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b),
        rank = Math.ceil(0.95 * sorted.length) - 1,
        idx = Math.min(sorted.length - 1, Math.max(0, rank));
    return sorted[idx];
}

/**
 * Reduce a raw per-iteration sample array into the 02-01 {@link TimingStat} (median + p95 + the raw
 * samples kept for auditability / re-analysis). All values are in milliseconds.
 */
export function toTimingStat(samples: number[]): TimingStat {
    return {
        medianMs: median(samples),
        p95Ms: p95(samples),
        samples: [...samples]
    };
}
