/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Detail on the most recent operation performed by one stage of Hoist's data pipeline, published
 * for performance debugging and developer tooling via `diagnostics` on {@link Store},
 * {@link View}, and {@link GridModel}.
 *
 * Each stage records the last operation of each kind it performs, rather than cumulative counters
 * - loads, updates, and filter runs differ by orders of magnitude in cost, so an average across
 * them describes nothing real. Read together across the three stages, these localize the cost of
 * a data change to the stage responsible for it.
 *
 * NOT a stable API. The `diagnostics` properties themselves are here to stay, but the shape of
 * these objects - and especially the set of `mode` values - tracks Hoist internals and can change
 * in any release. Use for debugging, dev tooling, and tests; do not drive application logic from
 * them.
 */
export interface DataOp {
    /** What the operation did - see each stage for its supported values. */
    mode: string;

    /** Records or rows in the result - the denominator that makes the other counts meaningful. */
    total: number;

    /** Timestamp (ms) the operation completed. */
    timestamp: number;
}

/**
 * How a {@link Store} derived a new set of records.
 *  - `patched` - expressed as a patch over the incumbent base, at a cost scaling with the change.
 *  - `flattened` - patch outgrew `experimental.patchRecordsMaxRatio` and was collapsed into a
 *    fresh base.
 *  - `rebased` - incoming records replaced the base outright, too much having changed to patch.
 *  - `full` - rebuilt in full, no incremental path available. Always the case without
 *    `experimental.patchableRecordSet`.
 */
export type StoreOpMode = 'patched' | 'flattened' | 'rebased' | 'full';

/** A record-set operation performed by a {@link Store}. */
export interface StoreOp extends DataOp {
    mode: StoreOpMode;

    /** Records replaced with a new instance. */
    update: number;

    /** Records added. */
    add: number;

    /** Records removed. */
    remove: number;
}

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
export type ViewOpMode =
    | 'dataOnly'
    | 'complexAggregators'
    | 'leafSetChanged'
    | 'filterCrossed'
    | 'dimensionChanged'
    | 'queryChanged'
    | 'cubeLoaded';

/** A row-generation operation performed by a Cube {@link View}. */
export interface ViewOp extends DataOp {
    mode: ViewOpMode;

    /** Rows served from cache unchanged. */
    reused: number;

    /** Cached rows recomputed in place. */
    rebuilt: number;

    /** Rows constructed from scratch. */
    created: number;
}

/**
 * Diagnostics published by a {@link Store} - see {@link DataOp} for the stability contract.
 */
export class StoreDiagnostics {
    /** Last full load of records into the Store. */
    @observable.ref lastLoad: StoreOp = null;

    /** Last transactional update of records in the Store. */
    @observable.ref lastUpdate: StoreOp = null;

    /**
     * Last run of the Store's filter. Note `update`/`add`/`remove` are populated only when the
     * filter ran incrementally - a `full` pass computes which records pass, not how that set
     * differs from the last one.
     */
    @observable.ref lastFilter: StoreOp = null;

    constructor() {
        makeObservable(this);
    }

    /** @internal */
    @action
    noteLoad(op: StoreOp) {
        this.lastLoad = op;
    }

    /** @internal */
    @action
    noteUpdate(op: StoreOp) {
        this.lastUpdate = op;
    }

    /** @internal */
    @action
    noteFilter(op: StoreOp) {
        this.lastFilter = op;
    }
}

/**
 * Diagnostics published by a Cube {@link View} - see {@link DataOp} for the stability contract.
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
