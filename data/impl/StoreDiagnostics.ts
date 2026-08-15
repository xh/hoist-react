/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import type {RecordSet} from './RecordSet';

/**
 * Diagnostics for Store.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class StoreDiagnostics {
    @observable.ref load: StoreOpStats = emptyStats();
    @observable.ref update: StoreOpStats = emptyStats();
    @observable.ref filter: StoreOpStats = emptyStats();

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(rs: RecordSet, start: number) {
        this.load = accumulate(this.load, rs, start);
    }

    @action
    noteUpdate(rs: RecordSet, start: number) {
        this.update = accumulate(this.update, rs, start);
    }

    @action
    noteFilter(rs: RecordSet, start: number) {
        this.filter = accumulate(this.filter, rs, start);
    }

    @action
    reset() {
        this.load = emptyStats();
        this.update = emptyStats();
        this.filter = emptyStats();
    }
}

export interface StoreOpStats {
    last: StoreOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): StoreOpStats => ({last: null, count: 0, elapsed: 0});

// Combine the counts the RecordSet computed while deriving `rs` with the elapsed time for the
// Store operation that drove it. The derivation is cleared once consumed, so a set passed through
// untouched - `withFilter` with no filter returns its receiver - is not reported a second time.
function accumulate(stats: StoreOpStats, rs: RecordSet, start: number): StoreOpStats {
    const {derivation} = rs;
    if (!derivation) return stats;
    rs.derivation = null;

    const op: StoreOp = {
        ...derivation,
        elapsed: performance.now() - start,
        timestamp: Date.now()
    };
    return {last: op, count: stats.count + 1, elapsed: stats.elapsed + op.elapsed};
}

export interface StoreOp {
    type: 'patched' | 'flattened' | 'rebased' | 'full';
    update: number;
    add: number;
    remove: number;
    total: number;
    elapsed: number;
    timestamp: number;
}

/** How a RecordSet instance was derived - counts only, stamped by Store. @internal */
export type RecordSetDerivation = Omit<StoreOp, 'elapsed' | 'timestamp'>;
