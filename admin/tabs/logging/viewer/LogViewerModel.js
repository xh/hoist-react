/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {find} from 'lodash';
import {action, observable, setter} from '@xh/hoist/mobx';
import {LastPromiseModel} from '@xh/hoist/promise';
import {GridModel} from '@xh/hoist/cmp/grid';
import {UrlStore} from '@xh/hoist/data';
import {baseCol} from '@xh/hoist/columns/Core';

@HoistModel()
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
        this.addReaction(this.syncSelectionReaction());
    }
    
    @action
    async loadAsync() {
        const files = this.files,
            fileSelection = files.selection,
            fileStore = files.store;
        await fileStore.loadAsync();
        if (fileSelection.isEmpty) {
            const latestAppLog = find(fileStore.records, ['filename', `${XH.appCode}.log`]);
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
    fetchFile() {
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
    }

    syncSelectionReaction() {
        return {
            track: () => this.files.selection.singleRecord,
            run: (rec) => {
                this.file = rec ? rec.filename : null;
                this.loadLines();
            },
            delay: 300
        };
    }
    
    destroy() {
        XH.safeDestroy(this.loadModel, this.files);
    }
}