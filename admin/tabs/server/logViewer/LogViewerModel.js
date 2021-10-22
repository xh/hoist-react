/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, isDisplayed} from '@xh/hoist/utils/js';
import {Icon} from '@xh/hoist/icon';
import {createRef} from 'react';
import download from 'downloadjs';
import {LogDisplayModel} from './LogDisplayModel';

/**
 * @private
 */
export class LogViewerModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminLogViewerState'};

    // Form State/Display options
    @bindable
    @persist
    tail = false;

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
    filesGridModel;

    get selectedRecord() {
        return this.filesGridModel.selectedRecord;
    }

    constructor() {
        super();
        makeObservable(this);

        this.filesGridModel = new GridModel({
            enableExport: true,
            hideHeaders: true,
            persistWith: this.persistWith,
            store: new UrlStore({
                url: 'logViewerAdmin/listFiles',
                idSpec: 'filename',
                dataRoot: 'files',
                fields: [{
                    name: 'filename',
                    type: 'string',
                    displayName: 'Log File'
                }]
            }),
            sortBy: ['filename|desc'],
            columns: [{
                field: 'filename',
                minWidth: 160,
                flex: true
            }]
        });

        this.addReaction(this.syncSelectionReaction());
        this.addReaction(this.toggleTailReaction());
        this.addReaction(this.reloadReaction());

        this.timer = Timer.create({
            runFn: () => this.autoRefreshLines(),
            interval: 5 * SECONDS,
            delay: true
        });
    }

    @action
    async doLoadAsync(loadSpec) {
        const {store, selModel} = this.filesGridModel;
        try {
            await store.loadAsync(loadSpec);
            if (selModel.isEmpty) {
                const latestAppLog = store.records.find(rec => rec.data.filename == `${XH.appCode}.log`);
                if (latestAppLog) {
                    selModel.select(latestAppLog);
                }
            }
        } catch (e) {
            XH.handleException(e, {title: 'Error loading list of available log files'});
        }
    }

    async downloadSelectedAsync() {
        try {
            const {selectedRecord} = this;
            if (!selectedRecord) return;

            const {filename} = selectedRecord.data,
                response = await XH.fetch({
                    url: 'logViewerAdmin/download',
                    params: {filename}
                });

            const blob = await response.blob();
            download(blob, filename);

            XH.toast({
                icon: Icon.download(),
                message: 'Download complete.'
            });

        } catch (e) {
            XH.handleException(e);
        }
    }

    //---------------------------------
    // Implementation
    //---------------------------------
    syncSelectionReaction() {
        return {
            track: () => this.selectedRecord,
            run: (rec) => {
                this.file = rec?.data?.filename;
                this.loadLog();
            },
            debounce: {interval: 300, leading: true}
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
