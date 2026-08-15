/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

export interface ViewOp {
    /** `dataOnly`, or the condition that forced a full regeneration. */
    type:
        | 'dataOnly'
        | 'complexAggregators'
        | 'leafSetChanged'
        | 'filterCrossed'
        | 'dimensionChanged'
        | 'queryChanged'
        | 'cubeLoaded';
    reused: number;
    rebuilt: number;
    created: number;
    total: number;
    timestamp: number;
}

/**
 * Detail on the last row generations performed by a Cube {@link View}.
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 */
export class ViewDiagnostics {
    @observable.ref lastLoad: ViewOp = null;
    @observable.ref lastUpdate: ViewOp = null;
    @observable.ref lastQuery: ViewOp = null;

    constructor() {
        makeObservable(this);
    }

    @action
    noteLoad(op: ViewOp) {
        this.lastLoad = op;
    }

    @action
    noteUpdate(op: ViewOp) {
        this.lastUpdate = op;
    }

    @action
    noteQuery(op: ViewOp) {
        this.lastQuery = op;
    }
}
