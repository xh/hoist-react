/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';

/**
 * The candidate plug-in seam (HARN-06) - the contract that makes the measurement harness reusable
 * for BOTH baseline measurement AND candidate evaluation, apples-to-apples through one protocol.
 *
 * The harness instruments and measures against this interface, so the implementation behind it is
 * the only variable:
 *
 * - The baseline adapter (built with the live Cube/View/GridModel wiring in the orchestrator plan,
 *   02-05) wraps the current pipeline: a snapshot maps to `Cube.loadDataAsync` and a diff maps to
 *   `Cube.updateDataAsync`, with results materialized through `View.result -> Store -> GridModel`.
 * - A candidate adapter (Phase 6/7) implements the same interface over a different engine, so the
 *   identical scenario, protocol, and scorecard apply to both.
 *
 * The methods mirror the invariant `View.result -> Store` integration seam Phase 1 mapped - the two
 * ingest operations every transport collapses to, plus read-back accessors for heap accounting and
 * scorecard row counts. This is deliberately shaped by the real Phase-1 contracts (confirmed
 * signatures: `Cube.loadDataAsync(rawData, info)` and `Cube.updateDataAsync(rawData, infoUpdates)`,
 * with `View.result` an observable object exposing a `rows` array), not an idealized abstraction.
 *
 * Note: no concrete `BaselineAdapter` is defined here - that wiring belongs with the orchestrator
 * plan that owns the live Cube/View/GridModel instances.
 */
export interface CandidateAdapter {
    /** Identifies which implementation produced a RunResult (e.g. 'baseline-cube'). */
    readonly id: string;

    /**
     * Full snapshot ingest. Maps to `Cube.loadDataAsync(rawRows, info)` for the baseline; a
     * candidate loads the same rows into its own engine. Resolves once results are materialized.
     */
    loadSnapshotAsync(rawRows: PlainObject[]): Promise<void>;

    /**
     * Incremental diff ingest. Maps to `Cube.updateDataAsync(diff, infoUpdates)` for the baseline;
     * `diff` holds add/update/remove rows keyed by `id`. Resolves once results are materialized.
     */
    applyDiffAsync(diff: PlainObject[]): Promise<void>;

    /** Current result row count - for heap accounting and scorecard `rowCounts`. */
    getResultRowCount(): number;

    /**
     * Current materialized result rows - for view-result heap accounting. Typed `unknown[]` because
     * the row shape is engine-specific (e.g. baseline `ViewRowData`); the harness only counts and
     * sizes them, it does not interpret their contents.
     */
    getResultRows(): unknown[];

    /** Teardown between scenarios - dispose engine state so iterations start from a clean heap. */
    disposeAsync(): Promise<void>;
}
