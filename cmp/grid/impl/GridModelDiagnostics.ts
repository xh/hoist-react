/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {RecordSet, RecordSetDelta} from '@xh/hoist/data/impl/RecordSet';
import type {HoistBase} from '@xh/hoist/core';
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Diagnostics for GridModel.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class GridModelDiagnostics extends BaseDiagnostics {
    @observable.ref transaction: GridOpStats = emptyStats();
    @observable.ref autosize: AutosizeOpStats = emptyAutosizeStats();

    constructor(owner: HoistBase) {
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

        this.logOp('transaction', op, `upd ${op.update} add ${op.add} rem ${op.remove}`);
    }

    @action
    noteAutosize(
        type: AutosizeOp['type'],
        columns: number,
        records: number,
        total: number,
        start: number
    ) {
        const op: AutosizeOp = {
            type,
            columns,
            records,
            total,
            elapsed: performance.now() - start,
            timestamp: Date.now()
        };
        const {count, elapsed} = this.autosize;
        this.autosize = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
        this.logOp('autosize', op, `cols ${op.columns} records ${op.records}`);
    }

    @action
    reset() {
        this.transaction = emptyStats();
        this.autosize = emptyAutosizeStats();
    }
}

export interface GridOpStats {
    last: GridOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): GridOpStats => ({last: null, count: 0, elapsed: 0});

export interface AutosizeOpStats {
    last: AutosizeOp;
    count: number;
    elapsed: number;
}

const emptyAutosizeStats = (): AutosizeOpStats => ({last: null, count: 0, elapsed: 0});

export interface AutosizeOp {
    // `elapsed` is latency, not CPU - autosize yields while measuring. `records` is the work.
    type: 'sized' | 'aborted' | 'notReady' | 'noColumns' | 'disabled';
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
