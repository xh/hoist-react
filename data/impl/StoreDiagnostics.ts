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
    @observable.ref load: StoreOpStats = emptyStats();
    @observable.ref update: StoreOpStats = emptyStats();
    @observable.ref filter: StoreOpStats = emptyStats();

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(op: StoreOp) {
        const {count, elapsed} = this.load;
        this.load = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    noteUpdate(op: StoreOp) {
        const {count, elapsed} = this.update;
        this.update = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    noteFilter(op: StoreOp) {
        const {count, elapsed} = this.filter;
        this.filter = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    reset() {
        this.load = emptyStats();
        this.update = emptyStats();
        this.filter = emptyStats();
    }
}

export interface StoreOpStats {
    last: StoreOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): StoreOpStats => ({last: null, count: 0, elapsed: 0});

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
