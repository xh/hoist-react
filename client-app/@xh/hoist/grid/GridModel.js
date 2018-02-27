/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {observable, action} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';

import {GridSelectionModel} from './GridSelectionModel';

/**
 * Core Model for a Grid.
 */
export class GridModel {

    // Immutable public properties
    url = '';
    dataRoot = null;
    processRawData = null;
    selection = new GridSelectionModel();
    loadModel = new LastPromiseModel();

    @observable columns = [];
    @observable records = [];

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
            .linkTo(this.loadModel)
            .catchDefault();
    }

    //--------------------------
    // Implementation
    //--------------------------
    @action
    completeLoad = (data) => {
        const {processRawData, dataRoot} = this;
        let rawRecords = dataRoot ? data[dataRoot] : data;
        if (processRawData) rawRecords = processRawData(rawRecords);
        this.records = rawRecords;
    }
}