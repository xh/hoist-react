/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable, override} from '@xh/hoist/mobx';
import type {PivotView} from '../PivotView';
import {ViewDiagnostics} from './ViewDiagnostics';

/**
 * Diagnostics for a {@link PivotView}, adding the pivot axis to what {@link ViewDiagnostics} reports.
 *
 * `RowCache` counts cell rows among its own totals, but gives no way to tell a wide pivot from a deep
 * row hierarchy - which is the first question asked of a slow one.
 *
 * Not intended as a stable API - shape and `type` values track Hoist internals and are subject
 * to change at any time.
 *
 * @internal
 */
export class PivotViewDiagnostics extends ViewDiagnostics {
    @observable.ref pivot: PivotOp = null;

    constructor(owner: PivotView) {
        super(owner);
        makeObservable(this);
    }

    /** Note the path discovery and cell build for one generation. */
    @action
    notePivot(op: Omit<PivotOp, 'timestamp'>) {
        this.pivot = {...op, timestamp: Date.now()};
        this.logOp(
            'pivot',
            {type: 'build', total: op.cells, elapsed: op.elapsed},
            `paths ${op.paths}`
        );
    }

    // MobX `override`, not `action` - re-annotating an inherited action is an error.
    @override
    override reset() {
        super.reset();
        this.pivot = null;
    }
}

export interface PivotOp {
    /** Nodes of the pivot path tree, including the synthetic root path. */
    paths: number;

    /** Cell rows materialized across the whole row hierarchy. */
    cells: number;

    /** Path discovery plus lattice and cell build, excluding base row generation. */
    elapsed: number;

    timestamp: number;
}
