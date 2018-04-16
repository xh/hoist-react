/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {action, observable} from 'hoist/mobx';

export class ConfigDifferDetailModel  {

    parent = null;

    @observable.ref record = null;

    constructor({parent}) {
        this.parent = parent;
    }

    @action
    showDetail(rec) {
        this.record = rec;
    }

    @action
    closeDetail() {
        this.record = null;
    }

    createDiffClass(field, local, remote) {
        if (!remote) return;
        if (!local || local[field] !== remote[field]) return 'diff';
    }

    confirmApplyRemote() {
        this.parent.confirmApplyRemote(this.record);
    }

}