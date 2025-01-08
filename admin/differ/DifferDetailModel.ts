/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {DifferModel} from './DifferModel';
import {StoreRecord} from '@xh/hoist/data';

/**
 * @internal
 */
export class DifferDetailModel extends HoistModel {
    parent: DifferModel = null;

    @observable.ref record: StoreRecord = null;

    constructor({parent}) {
        super();
        makeObservable(this);
        this.parent = parent;
    }

    @action
    open(rec: StoreRecord) {
        this.record = rec;
    }

    @action
    close() {
        this.record = null;
    }

    createDiffClass(field, local, remote) {
        if (!remote) return;
        if (!local || local[field] !== remote[field]) return 'diff';
    }

    confirmApplyRemote() {
        this.parent.confirmApplyRemote([this.record]);
    }
}
