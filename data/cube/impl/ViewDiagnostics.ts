/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, observableRef} from '@xh/hoist/mobx';
import type {View} from '../View';

/**
 * Diagnostics for Cube View.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class ViewDiagnostics extends BaseDiagnostics<View> {
    @observableRef accessor load: ViewOpStats = this.emptyStats();
    @observableRef accessor update: ViewOpStats = this.emptyStats();
    @observableRef accessor query: ViewOpStats = this.emptyStats();
    /** Path discovery and cell build for the last generation of a pivoted view, else null. */
    @observableRef accessor pivot: PivotOp = null;

    @action
    noteLoad(type: ViewOp['type'], start: number) {
        this.load = this.note('load', this.load, type, start);
    }

    @action
    noteUpdate(type: ViewOp['type'], start: number) {
        this.update = this.note('update', this.update, type, start);
    }

    @action
    noteQuery(type: ViewOp['type'], start: number) {
        this.query = this.note('query', this.query, type, start);
    }

    /** Note the path discovery and cell build for one generation of a pivoted view. */
    @action
    notePivot(op: Omit<PivotOp, 'timestamp'>) {
        this.pivot = {...op, timestamp: Date.now()};

        const phases = Object.entries(op.phases)
            .map(([name, ms]) => `${name} ${ms.toFixed(1)}`)
            .join(' ');
        this.logOp(
            'pivot',
            {type: 'build', total: op.cells, elapsed: op.elapsed},
            `paths ${op.paths} | ${phases}`
        );
    }

    @action
    reset() {
        this.load = this.emptyStats();
        this.update = this.emptyStats();
        this.query = this.emptyStats();
        this.pivot = null;
    }

    private note(
        kind: string,
        stats: ViewOpStats,
        type: ViewOp['type'],
        start: number
    ): ViewOpStats {
        const ret = this.accumulate(stats, type, start);
        if (ret !== stats)
            this.logOp(
                kind,
                ret.last,
                `reused ${ret.last.reused} rebuilt ${ret.last.rebuilt} created ${ret.last.created}`
            );
        return ret;
    }

    // Row counts come from the last generation - without one of its own, an op left the row set as
    // it found it, and every row was in effect reused.
    private accumulate(stats: ViewOpStats, type: ViewOp['type'], start: number): ViewOpStats {
        const {reused, rebuilt, created} = this.owner._rowCache,
            total = reused + rebuilt + created,
            op: ViewOp = {
                type,
                ...(type === 'fullUpdate'
                    ? {reused, rebuilt, created}
                    : {reused: total, rebuilt: 0, created: 0}),
                total,
                elapsed: performance.now() - start,
                timestamp: Date.now()
            };
        return {last: op, count: stats.count + 1, elapsed: stats.elapsed + op.elapsed};
    }

    private emptyStats(): ViewOpStats {
        return {last: null, count: 0, elapsed: 0};
    }
}

export interface ViewOpStats {
    last: ViewOp;
    count: number;
    elapsed: number;
}

export interface ViewOp {
    type: 'dataOnly' | 'fullUpdate' | 'unchanged';
    reused: number;
    rebuilt: number;
    created: number;
    total: number;
    elapsed: number;
    timestamp: number;
}

export interface PivotOp {
    /** Nodes of the pivot path tree, including the synthetic root path. */
    paths: number;

    /** Cell rows materialized across the whole row hierarchy. */
    cells: number;

    /** Sum of `phases` - all pivot work, excluding base row generation. */
    elapsed: number;

    phases: PivotPhases;

    timestamp: number;
}

/** Elapsed ms per phase of one pivot generation. Zero for phases a degenerate build skipped. */
export interface PivotPhases {
    /** Path discovery over the filtered records, ahead of base row generation. */
    discover: number;
    /** Group enumeration and the per-record leaf alignment pass. */
    align: number;
    /** `buildPivotStructure` - planning the cell set and its links over integer arrays. */
    plan: number;
    /** Cell row instantiation or reuse, wiring, and clearing of vacated cells. */
    build: number;
    /** Projection of cell values onto owner rows. */
    project: number;
}
