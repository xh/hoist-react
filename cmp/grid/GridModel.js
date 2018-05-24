/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {StoreContextMenu} from '@xh/hoist/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {castArray, find, isString, orderBy} from 'lodash';

import {ColChooserModel} from './ColChooserModel';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
@HoistModel()
export class GridModel {

    // Immutable public properties
    store = null;
    selection = null;
    contextMenuFn = null;
    colChooserModel = null;
    gridStateModel = null;

    @observable.ref agApi = null;
    @observable.ref columns = [];
    @observable.ref sortBy = [];
    @observable groupBy = null;

    // For cols defined (as expected) via a Hoist columnFactory,
    // strip enumerated Hoist custom configs before passing to ag-Grid.
    @computed
    get agColDefs() {
        return this.columns.map(col => {
            return col.agColDef ? col.agColDef() : col;
        });
    }

    defaultContextMenu = () => {
        return new StoreContextMenu([
            'copy',
            'copyWithHeaders',
            '-',
            'export',
            'autoSizeAll',
            '-',
            {
                text: 'Columns...',
                icon: Icon.grid(),
                hidden: !this.colChooserModel,
                action: () => {
                    this.colChooserModel.open();
                }
            }
        ]);
    };

    /**
     * @param {BaseStore} store - store containing the data for the grid.
     * @param {Object[]} columns - collection of column specifications.
     * @param {StoreSelectionModel} [selection] - selection model to use
     * @param {string} [emptyText] - empty text to display if grid has no records. Can be valid HTML.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {Object[]} [sortBy] - one or more sorters to apply to store data.
     * @param {string} [sortBy[].colId] - Column ID by which to sort.
     * @param {string} [sortBy[].sort] - sort direction [asc|desc].
     * @param {string} [groupBy] - Column ID by which to group.
     * @param {boolean} [enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {function} [contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        store,
        columns,
        selection,
        emptyText = null,
        sortBy = [],
        groupBy = null,
        enableColChooser = false,
        gridStateModel = null,
        contextMenuFn = () => this.defaultContextMenu()
    }) {
        this.store = store;
        this.columns = columns;
        this.contextMenuFn = contextMenuFn;

        this.selection = selection || new StoreSelectionModel({store: this.store});
        this.emptyText = emptyText;

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        if (gridStateModel) {
            this.gridStateModel = gridStateModel;
            this.gridStateModel.init(this);
        }
    }

    exportDataAsExcel(params) {
        if (!this.agApi) return;
        params.processCellCallback = this.formatValuesForExport;
        this.agApi.exportDataAsExcel(params);
    }

    /**
     * Select the first row in the grid.
     */
    selectFirst() {
        const {store, selection, sortBy} = this,
            colIds = sortBy.map(it => it.colId),
            sorts = sortBy.map(it => it.sort),
            recs = orderBy(store.records, colIds, sorts);

        if (recs.length) selection.select(recs[0]);
    }

    @action
    setAgApi(agApi) {
        this.agApi = agApi;
    }

    @action
    setGroupBy(field) {
        const cols = this.columns;

        cols.forEach(it => {
            if (it.rowGroup) {
                it.rowGroup = false;
                it.hide = false;
            }
        });

        if (field) {
            const col = find(cols, {field});
            if (col) {
                col.rowGroup = true;
                col.hide = true;
            }
        }
        
        this.columns = [...cols];
    }

    @action
    setSortBy(sortBy) {
        // Normalize string, and partially specified values
        sortBy = castArray(sortBy);
        sortBy = sortBy.map(it => {
            if (isString(it)) it = {colId: it};
            it.sort = it.sort || 'asc';
            return it;
        });

        this.sortBy = sortBy;
    }

    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    // TODO - review options for a "true" clone here, and behavior of setColumns() below.
    cloneColumns() {
        return [...this.columns];
    }

    @action
    setColumns(cols) {
        this.columns = [...cols];
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    // kinda want to set up this business with add Reacytion instateModel for symmetry, maybe I should put an observable on this model that track current agCols?
    syncColumnOrder() {
        const cols = this.columns,
            agCols = this.agApi.columnController.gridColumns,
            orderedCols = [];

        // This is best way I've found to check the column order in the grid (our observable doesn't change)
        // Also, these have an 'actualWidth' should we choose to go down that road
        agCols.forEach(agCol => {
            const newCol = find(cols, {field: agCol.colDef.field}); // have to use field as agGrid doesn't retain xhId
            orderedCols.push(newCol);
        });

        this.setColumns(orderedCols);
    }

    //-----------------------
    // Implementation
    //-----------------------
    formatValuesForExport(params) {
        const value = params.value,
            fmt = params.column.colDef.valueFormatter;
        if (value !== null && fmt) {
            return fmt(value);
        } else {
            return value;
        }
    }

    destroy() {
        XH.safeDestroy(this.colChooserModel);
        // TODO: How are Stores destroyed?
    }
}