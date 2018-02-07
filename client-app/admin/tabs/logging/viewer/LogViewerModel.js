/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';
import {action, observable, setter} from 'hoist/mobx';
import {baseCol} from 'hoist/columns/Core';
import {GridModel} from 'hoist/grid';

export class LogViewerModel {

    // Form State/Display options
    @observable tail = true;
    @observable startLine = 1;
    @observable maxLines = 1000;
    @observable pattern = '';

    // Overall State
    @observable file = null;
    @setter @observable rows = [];
    @observable filesCollapsed = false;

    files = new GridModel({
        url: 'logViewerAdmin/listFiles',
        dataRoot: 'files',
        columns: [
            baseCol({headerName: 'Log File', field: 'filename', width: 250})
        ]
    });

    @action
    loadFile(file) {
        this.file = file;
        this.loadLines();
    }

    @action
    toggleFilePanel() {
        this.filesCollapsed = !this.filesCollapsed;
    }

    @action
    async loadAsync() {
        this.files.loadAsync();
        this.loadLines();
    }

    @action
    loadLines() {
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
    }

    @action
    setDisplayOption(name, value) {
        this[name] = value;
    }
}