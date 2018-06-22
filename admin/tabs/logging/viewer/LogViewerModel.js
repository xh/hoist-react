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
    @observable @setter startLine = null;
    @observable @setter maxLines = 1000;
    @observable @setter pattern = '';

    // Overall State
    @observable file = null;
    @setter @observable.ref rows = [];
    tabPaneModel = null;

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

    constructor(tabPaneModel) {
        this.tabPaneModel = tabPaneModel;
        this.addReaction(this.syncSelectionReaction());
        this.addReaction(this.toggleTail());
    }
    
    @action
    async loadAsync() {
        const files = this.files,
            {store, selModel} = files;
        await store.loadAsync();
        if (selModel.isEmpty) {
            const latestAppLog = find(store.records, ['filename', `${XH.appCode}.log`]);
            if (latestAppLog) {
                selModel.select(latestAppLog);
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
            .then(rows => this.setRows(this.startLine ? rows.content : rows.content.reverse()))
            .linkTo(this.loadModel)
            .catchDefault();
    }

    syncSelectionReaction() {
        return {
            track: () => this.files.selectedRecord,
            run: (rec) => {
                this.file = rec ? rec.filename : null;
                this.loadLines();
            },
            delay: 300
        };
    }

    toggleTail() {
        return {
            track: () => this.tail,
            run: (checked) => {
                this.setStartLine(checked ? null : 1);
                this.fetchFile();
            }
        };
    }
    
    destroy() {
        XH.safeDestroy(this.loadModel, this.files);
    }
}