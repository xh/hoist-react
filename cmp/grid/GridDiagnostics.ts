/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DataOp} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * How a {@link GridModel} derived the transaction it synced to ag-Grid.
 *  - `delta` - read from a shared base at a cost scaling with the change.
 *  - `scanned` - computed by a full scan of the current and previous record sets, the two having
 *    no base in common. Always the case without `experimental.patchableRecordSet` on the Store.
 */
export type GridOpMode = 'delta' | 'scanned';

/** A transaction synced to ag-Grid by a {@link GridModel}. */
export interface GridOp extends DataOp {
    mode: GridOpMode;

    /** Rows sent to ag-Grid as updates. */
    update: number;

    /** Rows sent to ag-Grid as adds. */
    add: number;

    /** Rows sent to ag-Grid as removes. */
    remove: number;
}

/**
 * Diagnostics published by a {@link GridModel} - see {@link DataOp} for the stability contract.
 *
 * Comparing `update + add + remove` against `total` is the most direct read on whether record
 * reuse is working: a transaction approaching the size of the Store on every change means rows
 * are being rebuilt rather than reused, typically a missing or ineffective
 * {@link StoreConfig.reuseRecords} digest.
 */
export class GridDiagnostics {
    /** Last transaction synced to ag-Grid. */
    @observable.ref lastTransaction: GridOp = null;

    constructor() {
        makeObservable(this);
    }

    /** @internal */
    @action
    noteTransaction(op: GridOp) {
        this.lastTransaction = op;
    }
}
