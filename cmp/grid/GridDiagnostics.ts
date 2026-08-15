/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * How a {@link GridModel} derived the transaction it synced to ag-Grid.
 *  - `delta` - read from a shared base at a cost scaling with the change.
 *  - `scanned` - computed by a full scan of the current and previous record sets, the two having
 *    no base in common. Always the case without `experimental.patchableRecordSet` on the Store.
 */
export type GridOpType = 'delta' | 'scanned';

/** A transaction synced to ag-Grid by a {@link GridModel}. */
export interface GridOp {
    /** How the transaction was derived. */
    type: GridOpType;

    /** Rows sent to ag-Grid as updates. */
    update: number;

    /** Rows sent to ag-Grid as adds. */
    add: number;

    /** Rows sent to ag-Grid as removes. */
    remove: number;

    /** Rows in the grid's record set - the denominator that makes the counts above meaningful. */
    total: number;

    /** Timestamp (ms) the operation completed. */
    timestamp: number;
}

/**
 * Detail on the most recent transaction synced to ag-Grid by a {@link GridModel}, published for
 * performance debugging and developer tooling.
 *
 * Comparing `update + add + remove` against `total` is the most direct read on whether record
 * reuse is working: a transaction approaching the size of the Store on every change means rows
 * are being rebuilt rather than reused, typically a missing or ineffective
 * {@link StoreConfig.reuseRecords} digest. Read alongside `Store.diagnostics` and
 * `View.diagnostics`, these localize the cost of a data change to the stage responsible for it.
 *
 * NOT a stable API. `GridModel.diagnostics` itself is here to stay, but the shape of these
 * objects - and especially the set of `type` values - tracks Hoist internals and can change in any
 * release. Use for debugging, dev tooling, and tests; do not drive application logic from them.
 */
export class GridDiagnostics {
    /** Last transaction synced to ag-Grid. */
    @observable.ref lastTransaction: GridOp = null;

    constructor() {
        makeObservable(this);
    }

    /** @internal */
    @action
    noteTransaction(op: GridOp) {
        this.lastTransaction = op;
    }
}
