/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {checkMinVersion, debounced, isDisplayed} from '@xh/hoist/utils/js';
import download from 'downloadjs';
import {createRef} from 'react';
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

    deleteFileAction = {
        text: 'Delete',
        icon: Icon.delete(),
        intent: 'danger',
        recordsRequired: true,
        actionFn: () => this.deleteSelectedAsync()
    };

    downloadFileAction = {
        text: 'Download',
        icon: Icon.download(),
        recordsRequired: 1,
        disabled: !checkMinVersion(XH.environmentService.get('hoistCoreVersion'), '9.4'),
        actionFn: () => this.downloadSelectedAsync()
    };

    constructor() {
        super();
        makeObservable(this);

        this.filesGridModel = new GridModel({
            enableExport: true,
            hideHeaders: true,
            selModel: 'multiple',
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
            sortBy: 'filename',
            columns: [{field: 'filename', flex: true}],
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            contextMenu: [
                this.downloadFileAction,
                this.deleteFileAction,
                '-',
                ...GridModel.defaultContextMenu
            ]
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
                const latestAppLog = store.records.find(rec => rec.data.filename === `${XH.appCode}.log`);
                if (latestAppLog) {
                    selModel.select(latestAppLog);
                }
            }
        } catch (e) {
            XH.handleException(e, {title: 'Error loading list of available log files'});
        }
    }

    async deleteSelectedAsync() {
        try {
            const recs = this.filesGridModel.selectedRecords,
                count = recs.length;
            if (!count) return;

            const confirmed = await XH.confirm({
                title: 'Please Confirm',
                message: `Delete ${count} log files on the server? This cannot be undone.`
            });
            if (!confirmed) return;

            const filenames = recs.map(r => r.data.filename);
            await XH.fetch({
                url: 'logViewerAdmin/deleteFiles',
                params: {filenames}
            });
            await this.refreshAsync();
        } catch (e) {
            XH.handleException(e);
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
