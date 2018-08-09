/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {find} from 'lodash';
import {action, observable} from '@xh/hoist/mobx';
import {LastPromiseModel} from '@xh/hoist/promise';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {UrlStore} from '@xh/hoist/data';

/**
 * @private
 */
@HoistModel()
export class LogViewerModel {

    // Form State/Display options
    @observable tail = true;
    @observable startLine = null;
    @observable maxLines = 1000;
    @observable pattern = '';

    // Overall State
    @observable file = null;
    @observable.ref rows = [];

    loadModel = new LastPromiseModel();

    files = new GridModel({
        enableExport: true,
        store: new UrlStore({
            url: 'logViewerAdmin/listFiles',
            dataRoot: 'files',
            fields: ['filename']
        }),
        sortBy: [{colId: 'filename', sort: 'desc'}],
        columns: [
            {headerName: 'Log File', field: 'filename', minWidth: 160, flex: true}
        ]
    });

    constructor() {
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
            this.rows = [];
        } else {
            this.fetchFile();
        }
    }

    @action
    setTail(tail) {
        this.tail = tail;
    }

    @action
    setStartLine(startLine) {
        this.startLine = startLine;
    }

    @action
    setMaxLines(maxLines) {
        this.maxLines = maxLines;
    }

    @action
    setPattern(pattern) {
        this.pattern = pattern;
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
            .thenAction(rows => this.rows = this.startLine ? rows.content : rows.content.reverse())
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