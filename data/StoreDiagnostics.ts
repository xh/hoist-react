/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * How a {@link Store} derived a new set of records.
 *  - `patched` - expressed as a patch over the incumbent base, at a cost scaling with the change.
 *  - `flattened` - patch outgrew `experimental.patchRecordsMaxRatio` and was collapsed into a
 *    fresh base.
 *  - `rebased` - incoming records replaced the base outright, too much having changed to patch.
 *  - `full` - rebuilt in full, no incremental path available. Always the case without
 *    `experimental.patchableRecordSet`.
 */
export type StoreOpType = 'patched' | 'flattened' | 'rebased' | 'full';

/** A record-set operation performed by a {@link Store}. */
export interface StoreOp {
    /** How the operation derived its result. */
    type: StoreOpType;

    /** Records replaced with a new instance. */
    update: number;

    /** Records added. */
    add: number;

    /** Records removed. */
    remove: number;

    /** Records in the result - the denominator that makes the counts above meaningful. */
    total: number;

    /** Timestamp (ms) the operation completed. */
    timestamp: number;
}

/**
 * Detail on the most recent operations performed by a {@link Store}, published for performance
 * debugging and developer tooling.
 *
 * Records the last operation of each kind rather than cumulative counters - loads, updates, and
 * filter runs differ by orders of magnitude in cost, so an average across them describes nothing
 * real. Read alongside `View.diagnostics` and `GridModel.diagnostics`, these localize the cost of
 * a data change to the stage responsible for it.
 *
 * NOT a stable API. `Store.diagnostics` itself is here to stay, but the shape of these objects -
 * and especially the set of `type` values - tracks Hoist internals and can change in any release.
 * Use for debugging, dev tooling, and tests; do not drive application logic from them.
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
