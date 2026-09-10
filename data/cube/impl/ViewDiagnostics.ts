/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, observable} from '@xh/hoist/mobx';
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
    @observable.ref accessor load: ViewOpStats = this.emptyStats();
    @observable.ref accessor update: ViewOpStats = this.emptyStats();
    @observable.ref accessor query: ViewOpStats = this.emptyStats();

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
