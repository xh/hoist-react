/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {setter, observable, computed} from 'hoist/mobx';

/**
 * Model for managing the selection in a GridPanel.
 */
export class GridSelectionModel {

    @setter @observable records = [];

    @computed get singleRecord() {
        const recs = this.records;
        return recs.length === 1 ? recs[0] : null;
    }

    @computed get isEmpty() {
        return this.records.length === 0;
    }
}