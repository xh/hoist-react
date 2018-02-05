/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Model for the LogViewerPanel
 */
import {XH} from 'hoist';
import {observable, autorun, action, setter} from 'hoist/mobx';
import {baseCol} from 'hoist/columns/Core';
import {GridModel} from 'hoist/grid';

export class LogViewerPanelModel {
    @observable filesCollapsed = false;
    @observable tail = true;
    @observable file = null;
    @observable startLine = 1;
    @observable maxLines = 1000;
    @observable pattern = '';
    @setter @observable rows = [];

    files = new GridModel({
        url: 'logViewerAdmin/listFiles',
        dataRoot: 'files',
        columns: [
            baseCol({headerName: 'Log File', field: 'filename', width: 250})
        ]
    });

    @action
    async loadAsync() {
        this.files.loadAsync();
    }

    @action
    loadFile(file) {
        this.file = file;
    }

    @action
    toggleFilePanel() {
        this.filesCollapsed = !this.filesCollapsed;
    }

    //--------------------------------
    // Implementation
    //---------------------------------
    loadLines = autorun(() => {
        if (!this.file) {
            this.setRows([]);
            return;
        }

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
            .catchDefault();
    });

    @action
    refreshValues() {

    }
}