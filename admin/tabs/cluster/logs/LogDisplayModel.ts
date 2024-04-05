/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, ONE_SECOND, SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, isDisplayed} from '@xh/hoist/utils/js';
import {escapeRegExp, maxBy} from 'lodash';
import {LogViewerModel} from './LogViewerModel';

/**
 * @internal
 */
export class LogDisplayModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminLogViewerState'};

    parent: LogViewerModel;

    @managed
    panelModel = new PanelModel({
        collapsible: false,
        resizable: false,
        modalSupport: {width: '100vw', height: '100vh'}
    });

    // Form State/Display options
    @bindable
    @persist
    tail = false;

    @bindable startLine = 1;
    @bindable maxLines = 1000;
    @bindable pattern = '';

    @managed
    timer: Timer = null;

    @managed
    gridModel: GridModel;

    @bindable
    @persist
    regexOption: boolean = false;

    @bindable
    @persist
    caseSensitive: boolean = false;

    @bindable
    logRootPath: string;

    get tailActive(): boolean {
        return this.tail && !this.gridModel.hasSelection;
    }

    constructor(parent: LogViewerModel) {
        super();
        makeObservable(this);

        this.gridModel = this.createGridModel();

        this.parent = parent;

        this.addReaction({
            track: () => this.tail,
            run: tail => {
                this.startLine = tail ? null : 1;
                this.loadLog();
            },
            fireImmediately: true
        });

        this.addReaction({
            track: () => [this.parent.file, this.pattern, this.maxLines, this.startLine],
            run: () => this.loadLog()
        });

        this.timer = Timer.create({
            runFn: () => this.autoRefreshLines(),
            interval: ONE_SECOND,
            delay: true
        });
    }

    override async doLoadAsync(loadSpec) {
        const {parent} = this;

        if (!parent.file) {
            this.gridModel.clear();
            return;
        }

        try {
            const response = await XH.fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: parent.file,
                    startLine: this.startLine,
                    maxLines: this.maxLines,
                    pattern: this.regexOption ? this.pattern : escapeRegExp(this.pattern),
                    caseSensitive: this.caseSensitive,
                    instance: parent.instanceName
                },
                loadSpec
            });
            if (!response.success) throw XH.exception(response.exception);
            this.updateGridData(response.content);
        } catch (e) {
            // Show errors inline in the viewer vs. a modal alert or catchDefault().
            const msg = e.message || 'An unknown error occurred';
            this.updateGridData([[0, `Error: ${msg}`]]);
        }
    }

    async scrollToTail() {
        const {gridModel} = this;
        const lastRecord = maxBy(gridModel.store.records, 'id');
        // Ensure last record visible without requiring selection
        gridModel.agApi?.ensureNodeVisible(lastRecord);
    }

    //---------------------------------
    // Implementation
    //---------------------------------
    private createGridModel() {
        return new GridModel({
            selModel: 'multiple',
            hideHeaders: true,
            rowBorders: false,
            sizingMode: 'tiny',
            sortBy: 'rowNum|asc',
            store: {
                idSpec: 'rowNum'
            },
            columns: [
                {
                    field: {name: 'rowNum', type: 'number'},
                    width: 4,
                    cellClass: 'xh-log-display__row-number'
                },
                {
                    field: 'rowContent',
                    width: 1200,
                    autosizable: false,
                    cellClass: 'xh-log-display__row-content'
                }
            ],
            rowClassFn: () => 'xh-log-display__row',
            contextMenu: [
                'copy',
                '-',
                {
                    text: 'Select All',
                    actionFn: () => this.gridModel.selModel.selectAll(),
                    icon: Icon.plusCircle(),
                    secondaryText: 'Ctrl+A'
                },
                {
                    text: 'Deselect All',
                    actionFn: () => this.gridModel.clearSelection(),
                    icon: Icon.minusCircle()
                }
            ],
            onRowClicked: evt => {
                if (evt.data === this.gridModel.selectedRecord) {
                    this.gridModel.clearSelection();
                }
            }
        });
    }

    private updateGridData(data) {
        const {tailActive, gridModel} = this;
        let maxRowLength = 200;
        const gridData = data.map(row => {
            if (row[1].length > maxRowLength) {
                maxRowLength = row[1].length;
            }
            return {
                rowNum: row[0],
                rowContent: row[1]
            };
        });

        // Estimate the length of the row in pixels based on (character count) * (font size)
        gridModel.setColumnState([{colId: 'rowContent', width: maxRowLength * 6}]);

        gridModel.loadData(gridData);

        if (tailActive) {
            this.scrollToTail();
        }
    }

    private autoRefreshLines() {
        const {tailActive, parent} = this,
            {viewRef} = parent;

        if (
            tailActive &&
            olderThan(this.lastLoadCompleted, 5 * SECONDS) &&
            !this.loadModel.isPending &&
            isDisplayed(viewRef.current)
        ) {
            this.loadLog();
        }
    }

    @debounced(300)
    private loadLog() {
        this.refreshAsync();
    }
}
