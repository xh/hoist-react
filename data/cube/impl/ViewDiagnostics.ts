/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Diagnostics for Cube View.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class ViewDiagnostics {
    @observable.ref load: ViewOpStats = emptyStats();
    @observable.ref update: ViewOpStats = emptyStats();
    @observable.ref query: ViewOpStats = emptyStats();

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(op: ViewOp) {
        const {count, elapsed} = this.load;
        this.load = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    noteUpdate(op: ViewOp) {
        const {count, elapsed} = this.update;
        this.update = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    noteQuery(op: ViewOp) {
        const {count, elapsed} = this.query;
        this.query = {last: op, count: count + 1, elapsed: elapsed + op.elapsed};
    }

    @action
    reset() {
        this.load = emptyStats();
        this.update = emptyStats();
        this.query = emptyStats();
    }
}

export interface ViewOpStats {
    last: ViewOp;
    count: number;
    elapsed: number;
}

const emptyStats = (): ViewOpStats => ({last: null, count: 0, elapsed: 0});

export interface ViewOp {
    type: 'dataOnly' | 'fullUpdate';
    reused: number;
    rebuilt: number;
    created: number;
    total: number;
    elapsed: number;
    timestamp: number;
}
