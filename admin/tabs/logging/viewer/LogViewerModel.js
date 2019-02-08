/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {find} from 'lodash';
import {action, observable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {GridModel} from '@xh/hoist/cmp/grid';
import {UrlStore} from '@xh/hoist/data';

/**
 * @private
 */
@HoistModel
export class LogViewerModel {

    // Form State/Display options
    @observable tail = true;
    @observable startLine = null;
    @observable maxLines = 1000;
    @observable pattern = '';

    // Overall State
    @observable file = null;
    @observable.ref rows = [];

    @managed
    loadModel = new PendingTaskModel();

    @managed
    filesGridModel = new GridModel({
        enableExport: true,
        store: new UrlStore({
            url: 'logViewerAdmin/listFiles',
            idSpec: 'filename',
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
        this.addReaction(this.toggleTailReaction());
        this.addReaction(this.reloadReaction());
    }
    
    @action
    async loadAsync() {
        const {store, selModel} = this.filesGridModel;
        await store.loadAsync();
        if (selModel.isEmpty) {
            const latestAppLog = find(store.records, ['filename', `${XH.appCode}.log`]);
            if (latestAppLog) {
                selModel.select(latestAppLog);
            }
        }
        this.loadLines();
    }

    loadLines() {
        if (!this.file) {
            this.setRows([]);
        } else {
            this.fetchFileAsync();
        }
    }

    @action
    setRows(rows) {
        this.rows = rows;
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
    fetchFileAsync({isAutoRefresh = false} = {}) {
        if (!this.file) return;

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
            .then(response => {
                if (!response.success) throw new Error(response.exception);
                this.setRows(this.startLine ? response.content : response.content.reverse());
            })
            .linkTo(isAutoRefresh ? null : this.loadModel)
            .catch(e => {
                // Show errors inline in the viewer vs. a modal alert or catchDefault().
                const msg = e.message || 'An unknown error occurred';
                this.setRows([[0, `Error: ${msg}`]]);
                console.error(e);
            });
    }

    syncSelectionReaction() {
        return {
            track: () => this.filesGridModel.selectedRecord,
            run: (rec) => {
                this.file = rec ? rec.filename : null;
                this.loadLines();
            },
            delay: 300
        };
    }

    reloadReaction() {
        return {
            track: () => [this.pattern, this.maxLines, this.startLine],
            run: this.loadLines
        };
    }

    toggleTailReaction() {
        return {
            track: () => this.tail,
            run: (checked) => {
                this.setStartLine(checked ? null : 1);
                this.fetchFileAsync();
            }
        };
    }
}