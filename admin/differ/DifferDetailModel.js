/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * @private
 */
export class DifferDetailModel extends HoistModel  {

    parent = null;

    @observable.ref record = null;

    constructor({parent}) {
        super();
        makeObservable(this);
        this.parent = parent;
    }

    @action
    open(rec) {
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
