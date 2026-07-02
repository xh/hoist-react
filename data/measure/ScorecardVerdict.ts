/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {EnvelopeSummary, MetricTarget, MetricVerdict, Scorecard, TargetsConfig} from './types';

/**
 * Pure pass/fail verdict engine for the framework-resident measurement core (BASE-04).
 *
 * This module is the single scoring authority the Data Lab scorecard, comparison table,
 * envelope-summary display, and the distilled BASELINE report all read from - and that Phase 6
 * reuses unchanged to score candidate implementations. It is deliberately pure and framework-free:
 * it imports ONLY from `./types`, performs no I/O, holds no state, and touches no MobX / XH / fetch /
 * AG Grid API. Given the same inputs it always returns the same verdicts, so it is trivially
 * testable and safe to call from any context.
 *
 * The BASE-04 metrics split into two evaluation paths:
 *  - PER-SCORECARD (lower-is-better) - update->render latency, engine CPU, per-tab heap ceiling.
 *    Scored once per run from a single {@link Scorecard} by {@link evaluateScorecard}.
 *  - ENVELOPE-LEVEL (higher-is-better) - max records x fields, sustained throughput. Scored once per
 *    ladder from the whole-ladder {@link EnvelopeSummary} boundary facts by {@link evaluateEnvelope},
 *    surfaced in BASELINE.md (03-06) and an envelope-summary area (03-07), explicitly NOT as
 *    per-scorecard badges.
 *
 * Tier / verdict direction is driven by `MetricTarget.higherIsBetter` (see {@link computeMetricVerdict}).
 */

//------------------------------------------------------------------------------------------------
// Per-scorecard verdicts (BASE-01 / BASE-02 / BASE-03)
//------------------------------------------------------------------------------------------------

/**
 * Score the PER-SCORECARD metrics for a single measured run (lower-is-better). Returns one
 * {@link MetricVerdict} per per-scorecard metric whose backing Scorecard stat is present; a metric
 * is SKIPPED when its backing stat is null (mirroring nullable-pass handling - a run may skip the
 * performance or memory pass).
 *
 * Covers ONLY the four per-scorecard metrics and never emits verdicts for `maxRecordsXFields` or
 * `sustainedThroughput` - those are envelope-level (see {@link evaluateEnvelope}).
 *
 *  - `updateRenderLatencyMs` - end-to-end update->render latency = sum of the four stage medians
 *    (each null-coalesced to 0). Emitted when any of the four timing stages is present.
 *  - `enginePcpuMs`          - engine stage p95. Emitted when `sc.engine` is present.
 *  - heap ceiling            - `sc.heap.totalHeapDelta` vs `targets.heapCeilingReferenceBytes`.
 *    Emitted when `sc.heap` is present. The small-heap ceiling
 *    (`targets.heapCeilingSmallHeapBytes`) is evaluated per run by the caller passing that target as
 *    the ceiling when scoring a small-heap machine.
 */
export function evaluateScorecard(sc: Scorecard, targets: TargetsConfig): MetricVerdict[] {
    const verdicts: MetricVerdict[] = [];

    // update->render latency - present when any timing stage ran.
    const hasTiming =
        sc.engine != null || sc.genTxn != null || sc.bridgeCall != null || sc.render != null;
    if (hasTiming) {
        verdicts.push(
            computeMetricVerdict(
                'updateRenderLatencyMs',
                sumStageMedians(sc),
                targets.updateRenderLatencyMs
            )
        );
    }

    // engine sustained CPU - engine stage p95.
    if (sc.engine != null) {
        verdicts.push(computeMetricVerdict('enginePcpuMs', sc.engine.p95Ms, targets.enginePcpuMs));
    }

    // per-tab retained heap ceiling (reference machine).
    if (sc.heap != null) {
        verdicts.push(
            computeMetricVerdict(
                'heapCeilingReferenceBytes',
                sc.heap.totalHeapDelta,
                targets.heapCeilingReferenceBytes
            )
        );
    }

    return verdicts;
}

//------------------------------------------------------------------------------------------------
// Envelope-level verdicts (BASE-04 max-shape + sustained throughput)
//------------------------------------------------------------------------------------------------

/**
 * Score the ENVELOPE-LEVEL metrics for a whole ladder (higher-is-better). Runs ONCE against the
 * ladder-derived {@link EnvelopeSummary} boundary facts (savedRuns / envelope-stats), NOT against any
 * single Scorecard - so these are surfaced in the BASELINE report (03-06) and the envelope-summary
 * area (03-07), explicitly NOT as per-scorecard badges.
 *
 * Returns exactly two verdicts (the client must SUSTAIN AT LEAST the floor):
 *  - `maxRecordsXFields`  - `summary.maxComfortableRecordsXFields` vs `targets.maxRecordsXFields`.
 *  - `sustainedThroughput`- `summary.maxSustainedThroughput`       vs `targets.sustainedThroughput`.
 */
export function evaluateEnvelope(
    summary: EnvelopeSummary,
    targets: TargetsConfig
): MetricVerdict[] {
    return [
        computeMetricVerdict(
            'maxRecordsXFields',
            summary.maxComfortableRecordsXFields,
            targets.maxRecordsXFields
        ),
        computeMetricVerdict(
            'sustainedThroughput',
            summary.maxSustainedThroughput,
            targets.sustainedThroughput
        )
    ];
}

//------------------------------------------------------------------------------------------------
// Shared pure helpers
//------------------------------------------------------------------------------------------------

/**
 * End-to-end update->render latency (BASE-03): the sum of the four timing-stage medians, each
 * null-coalesced to 0 so a run that skipped a stage still yields a well-defined total.
 */
export function sumStageMedians(sc: Scorecard): number {
    return (
        (sc.engine?.medianMs ?? 0) +
        (sc.genTxn?.medianMs ?? 0) +
        (sc.bridgeCall?.medianMs ?? 0) +
        (sc.render?.medianMs ?? 0)
    );
}

/**
 * Score a single measured `value` against a {@link MetricTarget}, honoring `t.higherIsBetter`:
 *
 *  - lower-is-better (default): `verdict` is 'pass' when value <= floor; `meetsAspiration` when
 *    value <= aspiration; `tier` is 'comfortable' when value <= aspiration, 'degraded' when
 *    aspiration < value <= floor, else 'hardWall'.
 *  - higher-is-better: inverted - `verdict` is 'pass' when value >= floor; `meetsAspiration` when
 *    value >= aspiration; `tier` is 'comfortable' when value >= aspiration, 'degraded' when
 *    floor <= value < aspiration, else 'hardWall'.
 */
export function computeMetricVerdict(
    metric: string,
    value: number,
    t: MetricTarget
): MetricVerdict {
    const {floor, aspiration, higherIsBetter = false} = t;

    let verdict: MetricVerdict['verdict'], meetsAspiration: boolean, tier: MetricVerdict['tier'];

    if (higherIsBetter) {
        verdict = value >= floor ? 'pass' : 'fail';
        meetsAspiration = value >= aspiration;
        tier = value >= aspiration ? 'comfortable' : value >= floor ? 'degraded' : 'hardWall';
    } else {
        verdict = value <= floor ? 'pass' : 'fail';
        meetsAspiration = value <= aspiration;
        tier = value <= aspiration ? 'comfortable' : value <= floor ? 'degraded' : 'hardWall';
    }

    return {metric, value, floor, aspiration, verdict, meetsAspiration, tier};
}
