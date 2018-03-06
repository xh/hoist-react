/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {action, setter, observable, computed} from 'hoist/mobx';
import {castArray, unionBy} from 'lodash';

/**
 * Model for managing the selection in a GridPanel.
 */
export class GridSelectionModel {

    parent = null;

    @observable records = [];

    @computed get singleRecord() {
        const recs = this.records;
        return recs.length === 1 ? recs[0] : null;
    }

    @computed get isEmpty() {
        return this.records.length === 0;
    }

    constructor({parent}) {
        this.parent = parent;
    }

    /**
     * Set grid selection
     *
     * @param records, supports either single record, single id, array of records or array of ids
     * @param clearSelection, whether to clear previous selection rather than add to it.
     */
    @action
    select(records, clearSelection = true) {
        records = castArray(records).map(it => {
            return it.id ? it : this.parent.getById(it);
        });
        this.records = clearSelection ? records : unionBy(this.records, records, 'id');
    }

}