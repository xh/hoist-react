/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNumber} from 'lodash';

/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in a single column,
 * using a configured component for rendering each item.
 *
 * This is the primary app entry-point for specifying DataView component options and behavior.
 */
export class DataViewModel extends HoistModel {

    @managed
    gridModel;

    @bindable
    itemHeight;

    @bindable
    groupRowHeight;

    /**
     * @param {Object} c - DataViewModel configuration.
     * @param {(Store|Object)} c.store - a Store instance, or a config to create one.
     * @param {Column~rendererFn} c.renderer - renderer to use for each data row.
     * @param {(number|function)} itemHeight - Row height (in px) for each item displayed in the view,
     *      or a function which returns a number. Function will receive {record, dataViewModel, agParams}.
     * @param {(string|string[])} [c.groupBy] - field(s) by which to do full-width row grouping.
     * @param {number} [c.groupRowHeight] - Height (in px) of a group row.
     * @param {Grid~groupRowRendererFn} [c.groupRowRenderer] - function returning a string used to
     *      render group rows.
     * @param {Grid~groupRowElementRendererFn} [c.groupRowElementRenderer] - function returning a React
     *      element used to render group rows.
     * @param {(string|string[]|Object|Object[])} [c.sortBy] - field(s) or sorter config(s) with
     *      `colId` and `sort` (asc|desc) keys.
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` from which to create.
     * @param {string} [c.emptyText] - text/HTML to display if view has no records.
     * @param {boolean} [c.showHover] - true to highlight the currently hovered row.
     * @param {boolean} [c.rowBorders] - true to render row borders.
     * @param {boolean} [c.stripeRows] - true to use alternating backgrounds for rows.
     * @param {(Object[]|GridStoreContextMenuFn)} [c.contextMenu] - array of RecordActions, configs
     *      or token strings with which to create grid context menu items.  May also be specified
     *      as a function returning a StoreContextMenu. Desktop only.
     * @param {RowClassFn} [c.rowClassFn] - closure to generate CSS class names for a row.
     *      NOTE that, once added, classes will *not* be removed if the data changes.
     *      Use `rowClassRules` instead if StoreRecord data can change across refreshes.
     * @param {Object.<string, RowClassRuleFn>} [c.rowClassRules] - object keying CSS
     *      class names to functions determining if they should be added or removed from the row.
     *      See Ag-Grid docs on "row styles" for details.
     * @param {function} [c.onRowClicked] - Callback when a row is clicked. Function will receive an
     *      event with a data node containing the row's data. (Note that this may be null - e.g. for
     *      clicks on group rows.)
     * @param {function} [c.onRowDoubleClicked] - Callback to call when a row is double clicked.
     *      Function will receive an event with a data node containing the row's data.
     * @param {...*} [c.restArgs] - additional configs will be passed to the underlying
     *      GridModel. Note this is for advanced usage - not all configs supported, and many will
     *      override DataView defaults in ways that will break this component.
     */
    constructor({
        store,
        renderer,
        itemHeight,
        groupBy,
        groupRowHeight,
        groupRowRenderer,
        groupRowElementRenderer,
        sortBy,
        selModel,
        emptyText,
        showHover = false,
        rowBorders = false,
        stripeRows = false,
        contextMenu = null,
        rowClassFn,
        rowClassRules,
        onRowClicked,
        onRowDoubleClicked,
        ...restArgs
    }) {
        super();
        makeObservable(this);

        throwIf(
            !isFunction(itemHeight) && !isNumber(itemHeight),
            'Must specify DataViewModel.itemHeight as a number or a function to set a pixel height for each item.'
        );

        this.itemHeight = itemHeight;
        this.groupRowHeight = groupRowHeight;

        // We create a single visible 'synthetic' column in our DataView grid to hold our renderer
        // Also add hidden columns for all other fields to make sure grouping and sorting works!
        const columns = store.fields.map(field => {
            const fieldName = field.name ?? field;   // May be a StoreField, or just a config for one
            return {field: fieldName, hidden: true};
        });

        columns.push({
            colId: 'xhDataViewColumn',
            flex: true,
            renderer,
            rendererIsComplex: true
        });

        this.gridModel = new GridModel({
            store,
            sortBy,
            selModel,
            contextMenu,
            emptyText,
            showHover,
            rowBorders,
            stripeRows,
            groupBy,
            groupRowRenderer,
            groupRowElementRenderer,
            rowClassFn,
            rowClassRules,
            onRowClicked,
            onRowDoubleClicked,
            columns,
            ...restArgs
        });
    }

    // Getters and methods trampolined from GridModel.
    // Explicit trampolining to aid tooling and docs.
    get store()                 {return this.gridModel.store}
    get empty()                 {return this.gridModel.empty}
    get selModel()              {return this.gridModel.selModel}
    get hasSelection()          {return this.gridModel.hasSelection}
    get selectedRecords()       {return this.gridModel.selectedRecords}
    get selectedRecord()        {return this.gridModel.selectedRecord}
    get selectedId()            {return this.gridModel.selectedId}
    get groupBy()               {return this.gridModel.groupBy}
    get sortBy()                {return this.gridModel.sortBy}

    selectAsync(...args)            {return this.gridModel.selectAsync(...args)}
    preSelectFirstAsync(...args)    {return this.gridModel.preSelectFirstAsync(...args)}
    selectFirstAsync(...args)       {return this.gridModel.selectFirstAsync(...args)}
    ensureSelectionVisibleAsync()   {return this.gridModel.ensureSelectionVisibleAsync()}
    doLoadAsync(loadSpec)           {return this.gridModel.doLoadAsync(loadSpec)}
    loadData(...args)               {return this.gridModel.loadData(...args)}
    updateData(...args)             {return this.gridModel.updateData(...args)}
    clear()                         {return this.gridModel.clear()}
    setGroupBy(colIds)              {return this.gridModel.setGroupBy(colIds)}
    setSortBy(sorters)              {return this.gridModel.setSortBy(sorters)}
}
