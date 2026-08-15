/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import type {RowCache} from './RowCache';

/**
 * Diagnostics for Cube View.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class ViewDiagnostics {
    @observable.ref load: ViewOpStats = emptyStats();
    @observable.ref update: ViewOpStats = emptyStats();
    @observable.ref query: ViewOpStats = emptyStats();

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(cache: RowCache, type: ViewOp['type'], start: number) {
        this.load = accumulate(this.load, cache, type, start);
    }

    @action
    noteUpdate(cache: RowCache, type: ViewOp['type'], start: number) {
        this.update = accumulate(this.update, cache, type, start);
    }

    @action
    noteQuery(cache: RowCache, type: ViewOp['type'], start: number) {
        this.query = accumulate(this.query, cache, type, start);
    }

    @action
    reset() {
        this.load = emptyStats();
        this.update = emptyStats();
        this.query = emptyStats();
    }
}

export interface ViewOpStats {
    last: ViewOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): ViewOpStats => ({last: null, count: 0, elapsed: 0});

// Row counts come from the last generation - on a data-only update no generation ran, so the row
// set is unchanged and every row was, in effect, reused.
function accumulate(
    stats: ViewOpStats,
    cache: RowCache,
    type: ViewOp['type'],
    start: number
): ViewOpStats {
    const counts = cache.generationCounts,
        total = counts.reused + counts.rebuilt + counts.created,
        op: ViewOp = {
            type,
            ...(type === 'dataOnly' ? {reused: total, rebuilt: 0, created: 0} : counts),
            total,
            elapsed: performance.now() - start,
            timestamp: Date.now()
        };
    return {last: op, count: stats.count + 1, elapsed: stats.elapsed + op.elapsed};
}

export interface ViewOp {
    type: 'dataOnly' | 'fullUpdate';
    reused: number;
    rebuilt: number;
    created: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
