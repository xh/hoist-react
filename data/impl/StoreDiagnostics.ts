/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistBase} from '@xh/hoist/core';
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

    constructor(owner: HoistBase) {
        makeObservable(this);
        this.owner = owner;
    }

    startLogging() {
        this.logging = true;
    }

    stopLogging() {
        this.logging = false;
    }

    @action
    noteLoad(rs: RecordSet, start: number) {
        this.load = this.note('load', this.load, rs, start);
    }

    @action
    noteUpdate(rs: RecordSet, start: number) {
        this.update = this.note('update', this.update, rs, start);
    }

    @action
    noteFilter(rs: RecordSet, start: number) {
        this.filter = this.note('filter', this.filter, rs, start);
    }

    @action
    reset() {
        this.load = emptyStats();
        this.update = emptyStats();
        this.filter = emptyStats();
    }

    private owner: HoistBase;
    private logging = false;

    private note(kind: string, stats: StoreOpStats, rs: RecordSet, start: number): StoreOpStats {
        const ret = accumulate(stats, rs, start);
        if (this.logging && ret !== stats) {
            const {last: op} = ret;
            this.owner.logInfo(
                `${kind} ${op.type}`,
                `upd ${op.update} add ${op.add} rem ${op.remove}`,
                `total ${op.total}`,
                `${op.elapsed.toFixed(2)}ms`
            );
        }
        return ret;
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
