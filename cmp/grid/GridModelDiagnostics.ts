/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

export interface GridOp {
    type: 'delta' | 'scanned';
    update: number;
    add: number;
    remove: number;
    total: number;
    timestamp: number;
}

/**
 * Detail on the last transaction a {@link GridModel} synced to ag-Grid.
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 */
export class GridModelDiagnostics {
    @observable.ref lastTransaction: GridOp = null;

    constructor() {
        makeObservable(this);
    }

    @action
    noteTransaction(op: GridOp) {
        this.lastTransaction = op;
    }
}
