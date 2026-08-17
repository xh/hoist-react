/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import type {Store} from '../Store';
import type {RecordSet, RecordSetDerivation} from './RecordSet';

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
    noteLoad(rs: RecordSet, source: RecordSet, start: number) {
        this.load = this.note('load', this.load, rs, source, start);
    }

    @action
    noteUpdate(rs: RecordSet, source: RecordSet, start: number) {
        this.update = this.note('update', this.update, rs, source, start);
    }

    @action
    noteFilter(rs: RecordSet, source: RecordSet, start: number) {
        if (rs === source) return;
        this.filter = this.note('filter', this.filter, rs, source, start);
    }

    @action
    reset() {
        this.load = this.emptyStats();
        this.update = this.emptyStats();
        this.filter = this.emptyStats();
    }

    private note(
        kind: string,
        stats: StoreOpStats,
        rs: RecordSet,
        source: RecordSet,
        start: number
    ): StoreOpStats {
        const ret = this.accumulate(stats, rs, source, start);
        if (ret !== stats)
            this.logOp(
                kind,
                ret.last,
                `upd ${ret.last.update} add ${ret.last.add} rem ${ret.last.remove}`
            );
        return ret;
    }

    // Combine the counts the RecordSet computed while deriving `rs` with the elapsed time for the
    // Store operation that drove it. A set returned untouched stamps no derivation of its own - the
    // op did its work and found nothing to change. The derivation is cleared once consumed, so a
    // set is never reported twice.
    private accumulate(
        stats: StoreOpStats,
        rs: RecordSet,
        source: RecordSet,
        start: number
    ): StoreOpStats {
        const derivation = rs.derivation ?? (rs === source ? UNCHANGED : null);
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

const UNCHANGED: RecordSetDerivation = {type: 'unchanged', update: 0, add: 0, remove: 0};

export interface StoreOp {
    type: 'patched' | 'flattened' | 'full' | 'unchanged';
    update: number;
    add: number;
    remove: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
