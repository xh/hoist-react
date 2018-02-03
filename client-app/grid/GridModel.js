/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';
import {observable, action} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';
import {GridSelectionModel} from './GridSelectionModel';

/**
 * Core Model for a Grid.
 */
export class GridModel {

    url = '';
    dataRoot = null;
    processRawData = null;

    @observable columns = [];
    @observable records = [];
    selection = new GridSelectionModel();
    loadModel = new LastPromiseModel();

    constructor({url, dataRoot, columns, processRawData}) {
        this.url = url;
        this.dataRoot = dataRoot;
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
        const {processRawData, dataRoot} = this;
        if (dataRoot) records = records[dataRoot];
        if (processRawData) records = processRawData(records);
        this.records = records;
    }
}