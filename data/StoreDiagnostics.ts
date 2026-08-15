/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

export interface StoreOp {
    type: 'patched' | 'flattened' | 'rebased' | 'full';
    update: number;
    add: number;
    remove: number;
    total: number;
    timestamp: number;
}

export class StoreDiagnostics {
    @observable.ref lastLoad: StoreOp = null;
    @observable.ref lastUpdate: StoreOp = null;
    @observable.ref lastFilter: StoreOp = null;

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(op: StoreOp) {
        this.lastLoad = op;
    }

    @action
    noteUpdate(op: StoreOp) {
        this.lastUpdate = op;
    }

    @action
    noteFilter(op: StoreOp) {
        this.lastFilter = op;
    }
}
