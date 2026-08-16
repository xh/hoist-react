/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {RecordSet, RecordSetDelta} from '@xh/hoist/data/impl/RecordSet';
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import type {GridModel} from '@xh/hoist/cmp/grid';

/**
 * Diagnostics for GridModel.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class GridModelDiagnostics extends BaseDiagnostics<GridModel> {
    @observable.ref transaction: GridOpStats = this.emptyStats();
    @observable.ref autosize: AutosizeOpStats = this.emptyStats();

    constructor(owner: GridModel) {
        super(owner);
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

        this.logOp('transaction', op, `upd ${op.update} add ${op.add} rem ${op.remove}`);
    }

    @action
    noteAutosize(type: AutosizeOp['type'], columns: number, records: number, start: number) {
        const op: AutosizeOp = {
            type,
            columns,
            records,
            total: this.owner.store.records.length,
            elapsed: performance.now() - start,
            timestamp: Date.now()
        };
        const {count, elapsed} = this.autosize;
        this.autosize = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
        this.logOp('autosize', op, `cols ${op.columns} records ${op.records}`);
    }

    @action
    reset() {
        this.transaction = this.emptyStats();
        this.autosize = this.emptyStats();
    }

    //--------------
    // Implementation
    //---------------
    private emptyStats() {
        return {last: null, count: 0, elapsed: 0};
    }
}

export interface GridOpStats {
    last: GridOp;
    count: number;
    elapsed: number;
}

export interface AutosizeOpStats {
    last: AutosizeOp;
    count: number;
    elapsed: number;
}

export interface AutosizeOp {
    type: 'standard' | 'fillMode';
    columns: number;
    records: number;
    total: number;
    elapsed: number;
    timestamp: number;
}

export interface GridOp {
    type: 'delta' | 'scanned';
    update: number;
    add: number;
    remove: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
