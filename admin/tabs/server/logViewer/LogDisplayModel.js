/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, XH, managed, SizingMode, persist} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {Store} from '@xh/hoist/data';
import {Timer} from '@xh/hoist/utils/async';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {debounced, isDisplayed} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * @private
 */
export class LogDisplayModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminLogViewerState'};

    firstRowRef = createObservableRef();
    lastRowRef = createObservableRef();

    // Form State/Display options
    @bindable
    @persist
    tail = false;

    @bindable startLine = 1;
    @bindable maxLines = 1000;
    @bindable pattern = '';

    @managed
    timer = null;

    @managed
    logDisplayGrid;

    constructor(parent) {
        super();
        makeObservable(this);

        this.logDisplayGrid = this.createGridModel();

        this.parent = parent;

        this.addReaction({
            track: () => this.tail,
            run: (tail) => {
                this.setStartLine(tail ? null : 1);
                this.loadLog();
            },
            fireImmediately: true
        });
        this.timer = Timer.create({
            runFn: () => this.autoRefreshLines(),
            interval: 5 * SECONDS,
            delay: true
        });
        this.addReaction(this.reloadReaction());

        console.warn('Exposing foo to window');
        window.foo = this;
    }

    async doLoadAsync(loadSpec) {
        const {parent} = this;

        if (!parent.file) {
            this.logDisplayGrid.clear();
            return;
        }

        return XH
            .fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: parent.file,
                    startLine: this.startLine,
                    maxLines: this.maxLines,
                    pattern: this.pattern
                },
                loadSpec
            })
            .then(response => {
                if (!response.success) throw new Error(response.exception);
                this.updateGridData(response.content);
            })
            .catch(e => {
                // Show errors inline in the viewer vs. a modal alert or catchDefault().
                const msg = e.message || 'An unknown error occurred';
                this.updateGridData([[0, `Error: ${msg}`]]);
            });
    }

    //---------------------------------
    // Implementation
    //---------------------------------
    createGridModel() {
        return new GridModel({
            selModel: 'multiple',
            hideHeaders: true,
            rowBorders: false,
            sizingMode: SizingMode.TINY,
            sortBy: 'rowNum|asc',
            store: new Store({
                idSpec: 'rowNum',
                fields: [
                    {
                        name: 'rowNum',
                        type: 'number'
                    }, {
                        name: 'rowContent',
                        type: 'string'
                    }
                ]
            }),
            columns: [
                {
                    field: 'rowNum',
                    width: 4,
                    cellClass: 'xh-log-display__row-number'
                },
                {
                    field: 'rowContent',
                    width: 1200,
                    autosizable: false,
                    cellClass:  'xh-log-display__row-content'
                }
            ],
            rowClassFn: () => 'xh-log-display__row'

        });
    }

    updateGridData(data) {
        let maxRowLength = 200;
        const gridData = data.map(
            (row) => {
                if (row[1].length > maxRowLength) {
                    maxRowLength = row[1].length;
                }
                return {
                    'rowNum': row[0],
                    'rowContent': row[1]
                };
            });
        // Estimate the length of the row in pixels based on (character count) * (font size)
        this.logDisplayGrid.setColumnState([{colId: 'rowContent', width: maxRowLength * 6}]);

        this.logDisplayGrid.loadData(gridData);
    }

    reloadReaction() {
        return {
            track: () => [this.pattern, this.maxLines, this.startLine],
            run: () => this.doLoadAsync()
        };
    }

    autoRefreshLines() {
        const {viewRef} = this.parent;

        if (this.tail &&
            olderThan(this.lastLoadCompleted, 5 * SECONDS) &&
            isDisplayed(viewRef.current)
        ) {
            this.doLoadAsync();
        }
    }

    get tailIsDisplayed() {
        const {lastRowRef} = this,
            rect = lastRowRef.current && lastRowRef.current.getBoundingClientRect();
        return rect && rect.bottom <= window.innerHeight;
    }

    @debounced(300)
    loadLog() {
        this.refreshAsync();
    }
}
