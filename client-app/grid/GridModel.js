/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';
import {observable, action, LastPromiseModel} from 'hoist/mobx';
import {isArray} from 'lodash';
import {GridSelectionModel} from './GridSelectionModel';


/**
 * Model for Managing the loading of a Grid.
 */
export class GridModel {

    url = ''
    processRawData = null

    @observable records = [];
    @observable columns = [];
    @observable selection = new GridSelectionModel();
    @observable loadModel = new LastPromiseModel();

    constructor({url, columns, processRawData}) {
        this.url = url;
        this.columns = columns;
        this.processRawData = processRawData;
    }

    @action
    loadAsync() {
        return XH
            .fetchJson({url: this.url})
            .then(this.completeLoad)
            .bind(this.loadModel)
            .catchDefault();
    }

    //--------------------------
    // Implementation
    //--------------------------
    @action
    completeLoad = (records) => {
        const process = this.processRawData;

        records = isArray(records) ? records : records.data;
        this.records = process ? process(records) : records;
    }
}