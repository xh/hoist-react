/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {debounce, find} from 'lodash';
import {action, observable, setter, autorun} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';
import {GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {baseCol} from 'hoist/columns/Core';

export class LogViewerModel {

    // Form State/Display options
    @observable @setter tail = true;
    @observable @setter startLine = 1;
    @observable @setter maxLines = 1000;
    @observable @setter pattern = '';

    // Overall State
    @observable file = null;
    @setter @observable.ref rows = [];

    loadModel = new LastPromiseModel();

    files = new GridModel({
        store: new UrlStore({
            url: 'logViewerAdmin/listFiles',
            dataRoot: 'files',
            fields: ['filename']
        }),
        sortBy: [{colId: 'filename', sort: 'desc'}],
        columns: [
            baseCol({headerName: 'Log File', field: 'filename', minWidth: 160})
        ]
    });

    constructor() {
        autorun(() => {
            const sel = this.files.selection.singleRecord;
            this.file = sel ? sel.filename : null;
            this.loadLines();
        });
    }
    
    @action
    async loadAsync() {
        const files = this.files,
            fileSelection = files.selection,
            fileStore = files.store;
        await fileStore.loadAsync();
        if (fileSelection.isEmpty) {
            const latestAppLog = find(fileStore.records, ['filename', `${XH.appName.toLowerCase()}.log`]);
            if (latestAppLog) {
                fileSelection.select(latestAppLog);
            }
        }
        this.loadLines();
    }

    @action
    loadLines() {
        if (!this.file) {
            this.setRows([]);
        } else {
            this.fetchFile();
        }
    }

    //---------------------------------
    // Implementation
    //---------------------------------
    fetchFile = debounce(() => {
        return XH
            .fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: this.file,
                    startLine: this.startLine,
                    maxLines: this.maxLines,
                    pattern: this.pattern
                }
            })
            .then(rows => this.setRows(rows.content))
            .linkTo(this.loadModel)
            .catchDefault();
    }, 300);
}