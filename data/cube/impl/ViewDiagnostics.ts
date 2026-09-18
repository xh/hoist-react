/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
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
    @observable.ref load: ViewOpStats = this.emptyStats();
    @observable.ref update: ViewOpStats = this.emptyStats();
    @observable.ref query: ViewOpStats = this.emptyStats();

    constructor(owner: View) {
        super(owner);
        makeObservable(this);
    }

    @action
    noteLoad(type: ViewOp['type'], start: number) {
        this.load = this.note('load', this.load, type, start);
    }

    @action
    noteUpdate(type: ViewOp['type'], start: number, counts?: ViewRowCounts) {
        this.update = this.note('update', this.update, type, start, counts);
    }

    @action
    noteQuery(type: ViewOp['type'], start: number) {
        this.query = this.note('query', this.query, type, start);
    }

    @action
    reset() {
        this.load = this.emptyStats();
        this.update = this.emptyStats();
        this.query = this.emptyStats();
    }

    private note(
        kind: string,
        stats: ViewOpStats,
        type: ViewOp['type'],
        start: number,
        counts?: ViewRowCounts
    ): ViewOpStats {
        const ret = this.accumulate(stats, type, start, counts);
        if (ret !== stats)
            this.logOp(
                kind,
                ret.last,
                `reused ${ret.last.reused} rebuilt ${ret.last.rebuilt} created ${ret.last.created}`
            );
        return ret;
    }

    // Row counts come from the last generation unless the op supplies its own - without either, an
    // op left the row set as it found it, and every row was in effect reused.
    private accumulate(
        stats: ViewOpStats,
        type: ViewOp['type'],
        start: number,
        counts: ViewRowCounts
    ): ViewOpStats {
        const {reused, rebuilt, created} = this.owner._rowCache,
            genTotal = reused + rebuilt + created;
        counts ??=
            type === 'fullUpdate'
                ? {reused, rebuilt, created}
                : {reused: genTotal, rebuilt: 0, created: 0};
        const op: ViewOp = {
            type,
            ...counts,
            total: counts.reused + counts.rebuilt + counts.created,
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

export interface ViewRowCounts {
    reused: number;
    rebuilt: number;
    created: number;
}

export interface ViewOp extends ViewRowCounts {
    /**
     * `fullUpdate` regenerates all rows, `dataOnly` applies value changes to existing rows, and
     * `leafPopulation` adds and removes leaves in a leaves-only view in place - see View.
     */
    type: 'dataOnly' | 'leafPopulation' | 'fullUpdate' | 'unchanged';
    total: number;
    elapsed: number;
    timestamp: number;
}
