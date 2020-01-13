/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, isDisplayed} from '@xh/hoist/utils/js';
import {find} from 'lodash';
import {createRef} from 'react';

import {LogDisplayModel} from './LogDisplayModel';

/**
 * @private
 */
@HoistModel
@LoadSupport
export class LogViewerModel {

    // Form State/Display options
    @bindable tail = true;
    @bindable startLine = null;
    @bindable maxLines = 1000;
    @bindable pattern = '';

    // Overall State
    @observable file = null;

    viewRef = createRef();

    @managed
    timer = null;

    @managed
    logDisplayModel = new LogDisplayModel(this);

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

        this.timer = Timer.create({
            runFn: () => this.autoRefreshLines(),
            delay: 5 * SECONDS,
            interval: 5 * SECONDS
        });
    }

    @action
    async doLoadAsync(loadSpec) {
        const {store, selModel} = this.filesGridModel;
        await store.loadAsync(loadSpec);
        if (selModel.isEmpty) {
            const latestAppLog = find(store.records, ['filename', `${XH.appCode}.log`]);
            if (latestAppLog) {
                selModel.select(latestAppLog);
            }
        }
    }


    //---------------------------------
    // Implementation
    //---------------------------------
    syncSelectionReaction() {
        return {
            track: () => this.filesGridModel.selectedRecord,
            run: (rec) => {
                this.file = rec ? rec.get('filename') : null;
                this.loadLog();
            },
            delay: 300
        };
    }

    reloadReaction() {
        return {
            track: () => [this.pattern, this.maxLines, this.startLine],
            run: () => this.loadLog()
        };
    }

    toggleTailReaction() {
        return {
            track: () => this.tail,
            run: (tail) => {
                this.setStartLine(tail ? null : 1);
                this.loadLog();
            }
        };
    }

    autoRefreshLines() {
        const {logDisplayModel, tail, viewRef} = this;

        if (tail &&
            logDisplayModel.tailIsDisplayed &&
            olderThan(logDisplayModel.lastLoadCompleted, 5 * SECONDS) &&
            isDisplayed(viewRef.current)
        ) {
            logDisplayModel.refreshAsync();
        }
    }

    @debounced(300)
    loadLog() {
        this.logDisplayModel.loadAsync();
    }
}
