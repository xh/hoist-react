/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    ColumnRenderer,
    ColumnSpec,
    GridConfig,
    GridModel,
    GroupRowRenderer,
    RowClassFn,
    RowClassRuleFn,
    GridSorterLike,
    GridContextMenuSpec
} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, PlainObject, Some} from '@xh/hoist/core';
import {
    Store,
    StoreConfig,
    StoreRecord,
    StoreRecordOrId,
    StoreSelectionConfig,
    StoreSelectionModel,
    StoreTransaction
} from '@xh/hoist/data';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNumber} from 'lodash';

/**
 * Configuration for a DataView.
 *
 *  Additional properties not specified here will be passed to the underlying
 *  GridModel. Note this is for advanced usage - not all configs supported, and many will
 *  override DataView defaults in ways that will break this component.
 */
export interface DataViewConfig extends GridConfig {  // TODO: Accept grid keys without publicizing them?
    /** A Store instance, or a config to create one. */
    store?: Store|StoreConfig;

    /** Renderer to use for each data row. */
    renderer?: ColumnRenderer;

    /** Row height (in px) for each item displayed in the view, or a function which returns a number.*/
    itemHeight?: number|ItemHeightFn;

    /** Field(s) by which to do full-width row grouping. */
    groupBy?: Some<string>;

    /** Height (in px) of a group row. */
    groupRowHeight?: number;

    /** Function used to render group rows. */
    groupRowRenderer?: GroupRowRenderer;

    /** Sort specification. */
    sortBy?: Some<GridSorterLike>;

    /** Specification of selection behavior. Defaults to 'single' (desktop) and 'disabled' (mobile) */
    selModel?: StoreSelectionModel|StoreSelectionConfig|'single'|'multiple'|'disabled';

    /** Text/HTML to display if view has no records.*/
    emptyText?: string;

    /** True to highlight the currently hovered row.*/
    showHover?: boolean;

    /** True to render row borders.*/
    rowBorders?: boolean;

    /** True to use alternating backgrounds for rows.*/
    stripeRows?: boolean;

    /**
     * Array of RecordActions, dividers, or token strings with which to create a context menu.
     * May also be specified as a function returning same.
     */
    contextMenu?: GridContextMenuSpec;

    /**
     * Closure to generate CSS class names for a row.
     * NOTE that, once added, classes will *not* be removed if the data changes.
     * Use `rowClassRules` instead if StoreRecord data can change across refreshes.
     */
    rowClassFn?: RowClassFn;

    /**
     * Object keying CSS class names to functions determining if they should be added or
     * removed from the row. See Ag-Grid docs on "row styles" for details.
     */
    rowClassRules?: Record<string, RowClassRuleFn>;

    /**
     * Callback when a row is clicked - will receive an event with a data node containing
     * the row's data. (Note that this may be null - e.g. for clicks on full-width group rows.)
     */
    onRowClicked?: (e: any) => void;

    /**
     * Callback when a row is double clicked - will receive an event with a data node containing
     * the row's data. (Note that this may be null - e.g. for clicks on full-width group rows.)
     */
    onRowDoubleClicked?: (e: any) => void;
}

export type ItemHeightFn = (
    params: {
        record: StoreRecord,
        dataViewModel: DataViewModel,
        agParams: PlainObject
    }
) => number;


/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in a single column,
 * using a configured component for rendering each item.
 *
 * This is the primary app entry-point for specifying DataView component options and behavior.
 */
export class DataViewModel extends HoistModel {

    @managed gridModel: GridModel;
    @bindable.ref itemHeight: number | ItemHeightFn;
    @bindable groupRowHeight: number;

    constructor(config: DataViewConfig) {
        super();
        makeObservable(this);
        const {
            store,
            renderer,
            itemHeight,
            groupBy,
            groupRowHeight,
            groupRowRenderer,
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
        } = config;

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
            return {field: fieldName, hidden: true} as ColumnSpec;
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
            rowClassFn,
            rowClassRules,
            onRowClicked,
            onRowDoubleClicked,
            columns,
            ...restArgs
        });
    }

    // Getters and methods trampolined from GridModel.
    get store()                 {return this.gridModel.store}
    get empty()                 {return this.gridModel.empty}
    get selModel()              {return this.gridModel.selModel}
    get hasSelection()          {return this.gridModel.hasSelection}
    get selectedRecords()       {return this.gridModel.selectedRecords}
    get selectedRecord()        {return this.gridModel.selectedRecord}
    get selectedId()            {return this.gridModel.selectedId}
    get groupBy()               {return this.gridModel.groupBy}
    get sortBy()                {return this.gridModel.sortBy}

    selectAsync(records: Some<StoreRecordOrId>, opts: { ensureVisible?: boolean; clearSelection?: boolean; }) {
        return this.gridModel.selectAsync(records, opts);
    }

    preSelectFirstAsync() {
        return this.gridModel.preSelectFirstAsync();
    }

    selectFirstAsync(opts: {ensureVisible?: boolean} = {}) {
        return this.gridModel.selectFirstAsync(opts);
    }

    ensureSelectionVisibleAsync() {
        return this.gridModel.ensureSelectionVisibleAsync();
    }

    doLoadAsync(loadSpec: LoadSpec) {
        return this.gridModel.doLoadAsync(loadSpec);
    }

    loadData(rawData: any[], rawSummaryData?: PlainObject) {
        return this.gridModel.loadData(rawData, rawSummaryData);
    }

    updateData(rawData: PlainObject[] | StoreTransaction) {
        return this.gridModel.updateData(rawData);
    }

    clear() {
        return this.gridModel.clear();
    }

    setGroupBy(colIds: Some<string>) {
        return this.gridModel.setGroupBy(colIds);
    }

    setSortBy(sorters: Some<GridSorterLike>) {
        return this.gridModel.setSortBy(sorters);
    }
}
