/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {RecordSet, RecordSetDelta} from '@xh/hoist/data/impl/RecordSet';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Diagnostics for GridModel.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class GridModelDiagnostics {
    @observable.ref transaction: GridOpStats = emptyStats();

    constructor() {
        makeObservable(this);
    }

    @action
    noteTransaction(
        txn: Partial<RecordSetDelta>,
        newRs: RecordSet,
        prevRs: RecordSet,
        start: number
    ) {
        const op: GridOp = {
            // `deltaFrom` answers only when the two sets share a base - the same test the diff
            // makes internally, so this reports how that diff was actually derived.
            type: newRs.deltaFrom(prevRs) ? 'delta' : 'scanned',
            update: txn.update?.length ?? 0,
            add: txn.add?.length ?? 0,
            remove: txn.remove?.length ?? 0,
            total: newRs.count,
            elapsed: performance.now() - start,
            timestamp: Date.now()
        };
        const {count, elapsed} = this.transaction;
        this.transaction = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    reset() {
        this.transaction = emptyStats();
    }
}

export interface GridOpStats {
    last: GridOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): GridOpStats => ({last: null, count: 0, elapsed: 0});

export interface GridOp {
    type: 'delta' | 'scanned';
    update: number;
    add: number;
    remove: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
