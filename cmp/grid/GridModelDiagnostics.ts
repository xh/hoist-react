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
