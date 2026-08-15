/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * How a Cube {@link View} produced its rows.
 *  - `dataOnly` - applied new values to existing leaf rows without rebuilding the hierarchy.
 *
 * All other values indicate a full regeneration, and name the condition that forced it:
 *  - `complexAggregators` - an aggregator reads beyond its own children, so parent rows cannot be
 *    updated in place. See {@link Aggregator.dependsOnChildrenOnly}.
 *  - `leafSetChanged` - records entered or left the view's leaf set.
 *  - `filterCrossed` - an updated record changed which side of the view's filter it falls on.
 *  - `dimensionChanged` - an updated record changed a value the row hierarchy is grouped or
 *    bucketed by.
 *  - `queryChanged` - the view's query was updated.
 *  - `cubeLoaded` - the source Cube was loaded.
 */
export type ViewOpType =
    | 'dataOnly'
    | 'complexAggregators'
    | 'leafSetChanged'
    | 'filterCrossed'
    | 'dimensionChanged'
    | 'queryChanged'
    | 'cubeLoaded';

/** A row-generation operation performed by a Cube {@link View}. */
export interface ViewOp {
    /** How the View produced its rows - and, where it regenerated, what forced it to. */
    type: ViewOpType;

    /** Rows served from cache unchanged. */
    reused: number;

    /** Cached rows recomputed in place. */
    rebuilt: number;

    /** Rows constructed from scratch. */
    created: number;

    /** Rows in the result - the denominator that makes the counts above meaningful. */
    total: number;

    /** Timestamp (ms) the operation completed. */
    timestamp: number;
}

/**
 * Detail on the most recent operations performed by a Cube {@link View}, published for
 * performance debugging and developer tooling.
 *
 * Records the last operation of each kind rather than cumulative counters - a query change and a
 * streaming update differ by orders of magnitude in cost, so neither should mask the other. Read
 * alongside `Store.diagnostics` and `GridModel.diagnostics`, these localize the cost of a data
 * change to the stage responsible for it.
 *
 * NOT a stable API. `View.diagnostics` itself is here to stay, but the shape of these objects -
 * and especially the set of `type` values - tracks Hoist internals and can change in any release.
 * Use for debugging, dev tooling, and tests; do not drive application logic from them.
 */
export class ViewDiagnostics {
    /** Last regeneration triggered by a load of the source Cube. */
    @observable.ref lastLoad: ViewOp = null;

    /** Last response to a data change in the source Cube. */
    @observable.ref lastUpdate: ViewOp = null;

    /** Last regeneration triggered by a change to the View's query. */
    @observable.ref lastQuery: ViewOp = null;

    constructor() {
        makeObservable(this);
    }

    /** @internal */
    @action
    noteLoad(op: ViewOp) {
        this.lastLoad = op;
    }

    /** @internal */
    @action
    noteUpdate(op: ViewOp) {
        this.lastUpdate = op;
    }

    /** @internal */
    @action
    noteQuery(op: ViewOp) {
        this.lastQuery = op;
    }
}
