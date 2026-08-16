/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import type {Store} from '../Store';
import type {RecordSet} from './RecordSet';

/**
 * Diagnostics for Store.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class StoreDiagnostics extends BaseDiagnostics<Store> {
    @observable.ref load: StoreOpStats = this.emptyStats();
    @observable.ref update: StoreOpStats = this.emptyStats();
    @observable.ref filter: StoreOpStats = this.emptyStats();

    constructor(owner: Store) {
        super(owner);
        makeObservable(this);
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
    noteFilter(rs: RecordSet, source: RecordSet, start: number) {
        if (rs === source) return;
        this.filter = this.note('filter', this.filter, rs, start);
    }

    @action
    reset() {
        this.load = this.emptyStats();
        this.update = this.emptyStats();
        this.filter = this.emptyStats();
    }

    private note(kind: string, stats: StoreOpStats, rs: RecordSet, start: number): StoreOpStats {
        const ret = this.accumulate(stats, rs, start);
        if (ret !== stats)
            this.logOp(
                kind,
                ret.last,
                `upd ${ret.last.update} add ${ret.last.add} rem ${ret.last.remove}`
            );
        return ret;
    }

    // Combine the counts the RecordSet computed while deriving `rs` with the elapsed time for the
    // Store operation that drove it. The derivation is cleared once consumed, so a set passed
    // through untouched - `withFilter` with no filter returns its receiver - is not reported twice.
    private accumulate(stats: StoreOpStats, rs: RecordSet, start: number): StoreOpStats {
        const {derivation} = rs;
        if (!derivation) return stats;
        rs.derivation = null;

        const op: StoreOp = {
            ...derivation,
            total: rs.count,
            elapsed: performance.now() - start,
            timestamp: Date.now()
        };
        return {last: op, count: stats.count + 1, elapsed: stats.elapsed + op.elapsed};
    }

    private emptyStats(): StoreOpStats {
        return {last: null, count: 0, elapsed: 0};
    }
}

export interface StoreOpStats {
    last: StoreOp;
    count: number;
    elapsed: number;
}

export interface StoreOp {
    type: 'patched' | 'flattened' | 'full';
    update: number;
    add: number;
    remove: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
