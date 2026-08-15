/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Diagnostics for Store.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
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
