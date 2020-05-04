/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {AgGridModel} from '@xh/hoist/cmp/ag-grid';
import {Column, ColumnGroup} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {Store, StoreSelectionModel} from '@xh/hoist/data';
import {ColChooserModel as DesktopColChooserModel} from '@xh/hoist/dynamics/desktop';
import {ColChooserModel as MobileColChooserModel} from '@xh/hoist/dynamics/mobile';
import {action, observable} from '@xh/hoist/mobx';
import {start, wait} from '@xh/hoist/promise';
import {apiRemoved, debounced, deepFreeze, ensureUnique, errorIf, throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    cloneDeep,
    defaults,
    defaultsDeep,
    difference,
    find,
    findLast,
    isArray,
    isEmpty,
    isNil,
    isPlainObject,
    isString,
    isUndefined,
    last,
    map,
    max,
    min,
    pull,
    sortBy
} from 'lodash';
import {GridStateModel} from './GridStateModel';
import {GridSorter} from './impl/GridSorter';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 *
 * This is the primary application entry-point for specifying Grid component options and behavior.
 *
 * This model also supports nested tree data. To show a tree:
 *   1) Bind this model to a store with hierarchical records.
 *   2) Set `treeMode: true` on this model.
 *   3) Include a single column with `isTreeColumn: true`. This column will provide expand /
 *      collapse controls and indent child columns in addition to displaying its own data.
 *
 */
@HoistModel
@LoadSupport
export class GridModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {Store} */
    store;
    /** @member {StoreSelectionModel} */
    selModel;
    /** @member {boolean} */
    treeMode;
    /** @member {GridStateModel} */
    stateModel;
    /** @member {ColChooserModel} */
    colChooserModel;
    /** @member {function} */
    rowClassFn;
    /** @member {(Array|function)} */
    contextMenu;
    /** @member {number} */
    groupRowHeight;
    /** @member {Grid~groupRowRendererFn} */
    groupRowRenderer;
    /** @member {Grid~groupRowElementRendererFn} */
    groupRowElementRenderer;
    /** @member {GridGroupSortFn} */
    groupSortFn;
    /** @member {boolean} */
    enableColumnPinning;
    /** @member {boolean} */
    enableExport;
    /** @member {ExportOptions} */
    exportOptions;

    /** @member {AgGridModel} */
    @managed agGridModel;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object[]} - {@link Column} and {@link ColumnGroup} objects */
    @observable.ref columns = [];
    /** @member {ColumnState[]} */
    @observable.ref columnState = [];
    /** @member {Object} */
    @observable.ref expandState = {};
    /** @member {GridSorter[]} */
    @observable.ref sortBy = [];
    /** @member {string[]} */
    @observable.ref groupBy = null;
    /** @member {(string|boolean)} */
    @observable showSummary = false;
    /** @member {string} */
    @observable emptyText;

    static defaultContextMenu = [
        'copy',
        'copyWithHeaders',
        'copyCell',
        '-',
        'expandCollapseAll',
        '-',
        'exportExcel',
        'exportCsv',
        '-',
        'colChooser',
        'autoSizeColumns'
    ];

    /**
     * @param {Object} c - GridModel configuration.
     * @param {Object[]} c.columns - {@link Column} or {@link ColumnGroup} configs
     * @param {Object} [c.colDefaults] - Column configs to be set on all columns.  Merges deeply.
     * @param {(Store|Object)} [c.store] - a Store instance, or a config with which to create a
     *      Store. If not supplied, store fields will be inferred from columns config.
     * @param {boolean} [c.treeMode] - true if grid is a tree grid (default false).
     * @param {(string|boolean)} [c.showSummary] - location for a docked summary row. Requires
     *      `store.SummaryRecord` to be populated. Valid values are true/'top', 'bottom', or false.
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` with which to create one.
     * @param {(Object|string)} [c.stateModel] - config or string `gridId` for a GridStateModel.
     * @param {?string} [c.emptyText] - text/HTML to display if grid has no records.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {(string|string[]|Object|Object[])} [c.sortBy] - colId(s) or sorter config(s) with
     *      colId and sort direction.
     * @param {(string|string[])} [c.groupBy] - Column ID(s) by which to do full-width row grouping.
     * @param {string} [c.sizingMode] - one of large, standard, compact, tiny
     * @param {boolean} [c.showHover] - true to highlight the currently hovered row.
     * @param {boolean} [c.rowBorders] - true to render row borders.
     * @param {boolean} [c.stripeRows] - true (default) to use alternating backgrounds for rows.
     * @param {boolean} [c.cellBorders] - true to render cell borders.
     * @param {boolean} [c.showCellFocus] - true to highlight the focused cell with a border.
     * @param {boolean} [c.enableColumnPinning] - true to allow the user to manually pin / unpin
     *      columns via UI affordances.
     * @param {boolean} [c.enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {boolean} [c.enableExport] - true to enable exporting this grid and
     *      install default context menu items.
     * @param {ExportOptions} [c.exportOptions] - default export options.
     * @param {RowClassFn} [c.rowClassFn] - closure to generate CSS class names for a row.
     * @param {number} [c.groupRowHeight] - Height (in px) of a group row. Note that this will override
     *      `sizingMode` for group rows.
     * @param {Grid~groupRowRendererFn} [c.groupRowRenderer] - function returning a string used to
     *      render group rows.
     * @param {Grid~groupRowElementRendererFn} [c.groupRowElementRenderer] - function returning a React
     *      element used to render group rows.
     * @param {GridGroupSortFn} [c.groupSortFn] - function to use to sort full-row groups.
     *      Called with two group values to compare in the form of a standard JS comparator.
     *      Default is an ascending string sort. Set to `null` to prevent sorting of groups.
     * @param {(array|GridStoreContextMenuFn)} [c.contextMenu] - array of RecordActions, configs or token
     *      strings with which to create grid context menu items.  May also be specified as a
     *      function returning a StoreContextMenu.  Desktop only.
     * @param {Object}  [c.experimental] - flags for experimental features.  These features are designed
     *      for early client-access and testing, but are not yet part of the Hoist API.
     * @param {boolean} [c.experimental.externalSort] - Set to true to if application will be
     *      reloading data when the sortBy property changes on this model (either programmatically,
     *      or via user-click.)  Useful for applications with large data sets that are performing
     *      external, or server-side sorting and filtering.  Setting this flag mean that the grid
     *      should not immediately respond to user or programmatic changes to the sortBy property,
     *      but will instead wait for the next load of data, which is assumed to be pre-sorted.
     *      Default false.
     * @param {boolean} [c.experimental.useDeltaSort] - Set to true to use ag-Grid's experimental
     *      'deltaSort' feature designed to do incremental sorting.  Default false.
     * @param {boolean} [c.experimental.useTransaction] - set to false to use ag-Grid's
     *      deltaRowDataMode to internally generate transactions on data updates.  With the default
     *      (true) Hoist will generate the transaction on data update.
     * @param {*} [c...rest] - additional data to attach to this model instance.
     */
    constructor({
        store,
        columns,
        colDefaults = {},
        treeMode = false,
        showSummary = false,
        selModel,
        stateModel = null,
        emptyText = null,
        sortBy = [],
        groupBy = null,

        sizingMode = 'standard',
        showHover = false,
        rowBorders = false,
        cellBorders = false,
        stripeRows = true,
        showCellFocus = false,
        compact,

        enableColumnPinning = true,
        enableColChooser = false,
        enableExport = false,
        exportOptions = {},

        rowClassFn = null,

        groupRowHeight,
        groupRowRenderer,
        groupRowElementRenderer,
        groupSortFn,

        contextMenu,
        experimental,
        ...rest
    }) {
        this.treeMode = treeMode;
        this.showSummary = showSummary;

        this.emptyText = emptyText;
        this.rowClassFn = rowClassFn;
        this.groupRowHeight = groupRowHeight;
        this.groupRowRenderer = groupRowRenderer;
        this.groupRowElementRenderer = groupRowElementRenderer;
        this.groupSortFn = withDefault(groupSortFn, this.defaultGroupSortFn);
        this.contextMenu = withDefault(contextMenu, GridModel.defaultContextMenu);

        errorIf(rest.contextMenuFn,
            "GridModel param 'contextMenuFn' has been removed.  Use contextMenu instead"
        );
        errorIf(exportOptions.includeHiddenCols,
            "GridModel 'exportOptions.includeHiddenCols' has been removed.  Replace with {columns: 'ALL'}."
        );

        this.enableColumnPinning = enableColumnPinning;
        this.enableExport = enableExport;
        this.exportOptions = exportOptions;

        Object.assign(this, rest);

        this.colDefaults = colDefaults;
        this.setColumns(columns);
        this.store = this.parseStore(store);

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        this.agGridModel = new AgGridModel({
            sizingMode,
            compact,
            showHover,
            rowBorders,
            stripeRows,
            cellBorders,
            showCellFocus
        });

        this.colChooserModel = enableColChooser ? this.createChooserModel() : null;
        this.selModel = this.parseSelModel(selModel);
        this.stateModel = this.parseStateModel(stateModel);
        this.experimental = {
            externalSort: false,
            useTransactions: true,
            useDeltaSort: false,
            ...experimental
        };
        apiRemoved(experimental?.suppressUpdateExpandStateOnDataLoad, 'suppressUpdateExpandStateOnDataLoad');
    }

    /**
     * Export grid data using Hoist's server-side export.
     *
     * @param {ExportOptions} options - overrides of default export options to use for this export.
     */
    async exportAsync(options = {}) {
        throwIf(!this.enableExport, 'Export not enabled for this grid. See GridModel.enableExport');
        return XH.gridExportService.exportAsync(this, {...this.exportOptions, ...options});
    }

    /**
     * Export grid data using ag-Grid's built-in client-side export.
     *
     * @param {string} filename - name for exported file.
     * @param {string} type - type of export - one of ['excel', 'csv'].
     * @param {Object} params - passed to agGrid's export functions.
     */
    localExport(filename, type, params = {}) {
        const {agApi} = this.agGridModel;
        if (!agApi) return;
        defaults(params, {fileName: filename, processCellCallback: this.formatValuesForExport});

        if (type === 'excel') {
            agApi.exportDataAsExcel(params);
        } else if (type === 'csv') {
            agApi.exportDataAsCsv(params);
        }
    }

    /**
     * @param {(Object[]|Object)} records - single record/ID or array of records/IDs to select.
     * @param {boolean} [clearSelection] - true to clear previous selection (rather than add to it).
     */
    select(records, clearSelection = true) {
        this.selModel.select(records, clearSelection);
    }

    /** Select the first row in the grid. */
    selectFirst() {
        const {agGridModel, selModel} = this;
        if (!agGridModel.agApi) {
            console.warn('Called selectFirst before the grid was ready!');
            return;
        }

        // Find first displayed row with data - i.e. backed by a record, not a full-width group row.
        const id = agGridModel.getFirstSelectableRowNodeId();

        if (id) selModel.select(id);
    }

    /** Deselect all rows. */
    clearSelection() {
        this.selModel.clear();
    }

    /**
     * Scroll to ensure the selected record is visible.
     *
     * If multiple records are selected, scroll to the first record and then the last. This will do
     * the minimum scrolling necessary to display the start of the selection and as much as possible of the rest.
     */
    ensureSelectionVisible() {
        const {records} = this.selModel,
            {agApi} = this;

        if (!agApi) return;

        const indices = records.map(record => agApi.getRowNode(record.id).rowIndex);

        if (indices.length == 1) {
            agApi.ensureIndexVisible(indices[0]);
        } else if (indices.length > 1) {
            agApi.ensureIndexVisible(max(indices));
            agApi.ensureIndexVisible(min(indices));
        }
    }

    /** @return {boolean} - true if any records are selected. */
    get hasSelection() {return !this.selModel.isEmpty}

    /** @return {Record[]} - currently selected Records. */
    get selection() {return this.selModel.records}

    /** @return {?Record} - single selected record, or null if multiple or no records selected. */
    get selectedRecord() {return this.selModel.singleRecord}

    /** @return {boolean} - true if this grid has no records to show in its store. */
    get empty() {return this.store.empty}

    get isReady() {return this.agGridModel.isReady}
    get agApi() {return this.agGridModel.agApi}
    get agColumnApi() {return this.agGridModel.agColumnApi}

    get sizingMode() {return this.agGridModel.sizingMode}
    setSizingMode(sizingMode) {this.agGridModel.setSizingMode(sizingMode)}

    get showHover() { return this.agGridModel.showHover }
    setShowHover(showHover) { this.agGridModel.setShowHover(showHover) }

    get rowBorders() { return this.agGridModel.rowBorders }
    setRowBorders(rowBorders) { this.agGridModel.setRowBorders(rowBorders) }

    get stripeRows() { return this.agGridModel.stripeRows }
    setStripeRows(stripeRows) { this.agGridModel.setStripeRows(stripeRows) }

    get cellBorders() { return this.agGridModel.cellBorders }
    setCellBorders(cellBorders) { this.agGridModel.setCellBorders(cellBorders) }

    get showCellFocus() { return this.agGridModel.showCellFocus }
    setShowCellFocus(showCellFocus) { this.agGridModel.setShowCellFocus(showCellFocus) }

    /**
     * Apply full-width row-level grouping to the grid for the given column ID(s).
     * This method will clear grid grouping if provided any ids without a corresponding column.
     * @param {(string|string[])} colIds - column ID(s) for row grouping, or falsey value to ungroup.
     */
    @action
    setGroupBy(colIds) {
        colIds = isNil(colIds) ? [] : castArray(colIds);

        const invalidColIds = colIds.filter(it => !this.findColumn(this.columns, it));
        if (invalidColIds.length) {
            console.warn('Unknown colId specified in groupBy - grid will not be grouped.', invalidColIds);
            colIds = [];
        }

        this.groupBy = colIds;
    }

    /** Expand all parent rows in grouped or tree grid. (Note, this is recursive for trees!) */
    expandAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.expandAll();
            this.noteAgExpandStateChange();
        }
    }

    /** Collapse all parent rows in grouped or tree grid. */
    collapseAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.collapseAll();
            this.noteAgExpandStateChange();
        }
    }

    /**
     * Set the location for a docked summary row. Requires `store.SummaryRecord` to be populated.
     * @param {(string|boolean)} showSummary - true/'top' or 'bottom' to show summary, false to hide.
     */
    @action
    setShowSummary(showSummary) {
        this.showSummary = showSummary;
    }

    /**
     * Set the text displayed when the grid is empty.
     * @param {?string} emptyText - text/HTML to display if grid has no records.
     */
    @action
    setEmptyText(emptyText) {
        this.emptyText = emptyText;
    }

    /**
     * This method is no-op if provided any sorters without a corresponding column.
     * @param {(string|string[]|Object|Object[])} sorters - colId(s), GridSorter config(s)
     *      GridSorter strings, or a falsy value to clear the sort config.
     */
    @action
    setSortBy(sorters) {
        if (!sorters) {
            this.sortBy = [];
            return;
        }

        sorters = castArray(sorters);
        sorters = sorters.map(it => {
            if (it instanceof GridSorter) return it;
            return GridSorter.parse(it);
        });

        const invalidSorters = sorters.filter(it => !this.findColumn(this.columns, it.colId));
        if (invalidSorters.length) {
            console.warn('GridSorter colId not found in grid columns', invalidSorters);
            return;
        }

        this.sortBy = sorters;
    }

    /** Load the underlying store. */
    async doLoadAsync(loadSpec) {
        throwIf(!this.store.isLoadSupport, 'Underlying store does not define support for loading.');
        return this.store.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    /** Update the underlying store. */
    updateData(...args) {
        return this.store.updateData(...args);
    }

    /** Clear the underlying store, removing all rows. */
    clear() {
        this.store.clear();
    }

    /** @param {Object[]} colConfigs - {@link Column} or {@link ColumnGroup} configs. */
    @action
    setColumns(colConfigs) {
        throwIf(
            !isArray(colConfigs),
            'GridModel requires an array of column configurations.'
        );

        throwIf(
            colConfigs.some(c => !isPlainObject(c)),
            'GridModel only accepts plain objects for Column or ColumnGroup configs'
        );

        const columns = colConfigs.map(c => this.buildColumn(c));

        this.validateColumns(columns);

        this.columns = columns;
        this.columnState = this.getLeafColumns()
            .map(({colId, width, hidden, pinned}) => ({colId, width, hidden, pinned}));
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    noteAgColumnStateChanged(agColState) {
        const colStateChanges = agColState.map(({colId, width, hide, pinned}) => {
            const col = this.findColumn(this.columns, colId);
            if (!col) return null;
            return {
                colId,
                pinned,
                hidden: hide,
                width: col.flex ? undefined : width
            };
        });

        pull(colStateChanges, null);
        this.applyColumnStateChanges(colStateChanges);
    }

    @action
    setExpandState(expandState) {
        this.agGridModel.setExpandState(expandState);
        this.noteAgExpandStateChange();
    }

    @action
    noteAgExpandStateChange() {
        const agModelState = this.agGridModel.getExpandState();

        if (!equal(this.expandState, agModelState)) {
            this.expandState = deepFreeze(agModelState);
        }
    }

    // We debounce this method because the implementation of `AgGridModel.setSelectedRowNodeIds()`
    // selects nodes one-by-one, and ag-Grid will fire a selection changed event for each iteration.
    // This avoids a storm of events looping through the reaction when selecting in bulk.
    @debounced(0)
    noteAgSelectionStateChanged() {
        const {selModel, agGridModel} = this;
        selModel.select(agGridModel.getSelectedRowNodeIds());
    }

    /**
     * This method will update the current column definition. Throws an exception if any of the
     * columns provided in colStateChanges are not present in the current column list.
     *
     * Note: Column ordering is determined by the individual (leaf-level) columns in state.
     * This means that if a column has been redefined to a new column group, that entire group may
     * be moved to a new index.
     *
     * @param {ColumnState[]} colStateChanges - changes to apply to the columns. If all leaf
     *     columns are represented in these changes then the sort order will be applied as well.
     */
    @action
    applyColumnStateChanges(colStateChanges) {
        let columnState = cloneDeep(this.columnState);

        throwIf(colStateChanges.some(({colId}) => !this.findColumn(columnState, colId)),
            'Invalid columns detected in column changes!');

        // 1) Update any width, visibility or pinned changes
        colStateChanges.forEach(change => {
            const col = this.findColumn(columnState, change.colId);

            if (!isNil(change.width)) col.width = change.width;
            if (!isNil(change.hidden)) col.hidden = change.hidden;
            if (!isUndefined(change.pinned)) col.pinned = change.pinned;
        });

        // 2) If the changes provided is a full list of leaf columns, synchronize the sort order
        const leafCols = this.getLeafColumns();
        if (colStateChanges.length === leafCols.length) {
            // 2.a) Mark (potentially changed) sort order
            colStateChanges.forEach((change, index) => {
                const col = this.findColumn(columnState, change.colId);
                col._sortOrder = index;
            });

            // 2.b) Install implied group sort orders and sort
            columnState.forEach(it => this.markGroupSortOrder(it));
            columnState = this.sortColumns(columnState);

            // 2.c) Force any emptyFlexCol that is last to stay last (avoid user dragging)!
            const emptyFlex = findLast(columnState, {colId: 'emptyFlex'});
            if (emptyFlex && last(this.columns).colId === 'emptyFlex' && last(columnState) !== emptyFlex) {
                pull(columnState, emptyFlex).push(emptyFlex);
            }
        }

        this.columnState = columnState;
    }

    /**
     * @param colId - id of the Column to get
     * @returns {Column} - The Column with the given colId, or null if no Column was found with
     *      the given colId
     */
    getColumn(colId) {
        return this.findColumn(this.columns, colId);
    }

    /**
     * Return all leaf-level columns - i.e. excluding column groups.
     * @returns {Column[]}
     */
    getLeafColumns() {
        return this.gatherLeaves(this.columns);
    }

    /**
     * Return all currently-visible leaf-level columns.
     * @returns {Column[]}
     */
    getVisibleLeafColumns() {
        return this.getLeafColumns().filter(it => this.isColumnVisible(it.colId));
    }

    /**
     * Determine whether or not a given leaf-level column is currently visible.
     *
     * Call this method instead of inspecting the `hidden` property on the Column itself, as that
     * property is not updated with state changes.
     *
     * @param {String} colId
     * @returns {boolean}
     */
    isColumnVisible(colId) {
        const state = this.getStateForColumn(colId);
        return state ? !state.hidden : false;
    }

    /**
     * Determine if a leaf-level column is currently pinned.
     *
     * Call this method instead of inspecting the `pinned` property on the Column itself, as that
     * property is not updated with state changes.
     *
     * @param {String} colId
     * @returns {string}
     */
    getColumnPinned(colId) {
        const state = this.getStateForColumn(colId);
        return state ? state.pinned : null;
    }

    /**
     * Return matching leaf-level Column or ColumnState object from the provided collection for the
     * given colId, if any. Used as a utility function to find both types of objects.
     */
    findColumn(cols, colId) {
        for (let col of cols) {
            if (col.children) {
                const ret = this.findColumn(col.children, colId);
                if (ret) return ret;
            } else {
                if (col.colId == colId) return col;
            }
        }
        return null;
    }

    /**
     * Return the current state object representation for the given colId.
     *
     * Note that column state updates do not write changes back to the original Column object (as
     * held in this model's `columns` collection), so this method should be called whenever the
     * current value of any state-tracked property is required.
     *
     * @param {string} colId
     * @returns {ColumnState}
     */
    getStateForColumn(colId) {
        return find(this.columnState, {colId});
    }

    buildColumn(c) {
        return c.children ? new ColumnGroup(c, this) : new Column(defaultsDeep({}, c, this.colDefaults), this);
    }

    /**
     * Autosize columns to fit their contents.
     * @param {string|string[]} [colIds] - which columns to autosize; defaults to all leaf columns.
     */
    autoSizeColumns(colIds) {
        if (!colIds) colIds = this.getLeafColumns().map(col => col.colId);

        colIds = castArray(colIds).filter(id => {
            const col = this.getColumn(id);
            return col && col.resizable && !col.hidden && !col.flex;
        });
        if (colIds.length) {
            start().then(async () => {
                this.agApi.showLoadingOverlay();

                const colStateChanges = XH.gridAutosizeService.autoSizeColumns({gridModel: this, colIds});
                this.applyColumnStateChanges(colStateChanges);

                console.debug('Columns autosized:', colStateChanges);

                await wait(100);
                this.agApi.hideOverlay();
            });
        }
    }

    //-----------------------
    // Implementation
    //-----------------------
    gatherLeaves(columns, leaves = []) {
        columns.forEach(col => {
            if (col.groupId) this.gatherLeaves(col.children, leaves);
            if (col.colId) leaves.push(col);
        });

        return leaves;
    }

    markGroupSortOrder(col) {
        if (col.groupId) {
            col.children.forEach(child => this.markGroupSortOrder(child));
            col._sortOrder = col.children[0]._sortOrder;
        }
    }

    sortColumns(columns) {
        columns.forEach(col => {
            if (col.children) {
                col.children = this.sortColumns(col.children);
            }
        });

        return sortBy(columns, [it => it._sortOrder]);
    }

    validateColumns(cols) {
        if (isEmpty(cols)) return;

        const {groupIds, colIds} = this.collectIds(cols);

        ensureUnique(colIds, 'All colIds in a GridModel columns collection must be unique.');
        ensureUnique(groupIds, 'All groupIds in a GridModel columns collection must be unique.');

        const treeCols = cols.filter(it => it.isTreeColumn);
        warnIf(
            this.treeMode && treeCols.length != 1,
            'Grids in treeMode should include exactly one column with isTreeColumn:true.'
        );
    }

    collectIds(cols, groupIds = [], colIds = []) {
        cols.forEach(col => {
            if (col.colId) colIds.push(col.colId);
            if (col.groupId) {
                groupIds.push(col.groupId);
                this.collectIds(col.children, groupIds, colIds);
            }
        });
        return {groupIds, colIds};
    }

    formatValuesForExport(params) {
        const value = params.value,
            fmt = params.column.colDef.valueFormatter;
        if (value !== null && fmt) {
            return fmt(value);
        } else {
            return value;
        }
    }

    parseStore(store) {
        store = withDefault(store, {});

        if (store instanceof Store) {
            return store;
        }

        if (isPlainObject(store)) {
            // Ensure store config has a complete set of fields for all configured columns.
            const fields = store.fields || [],
                storeFieldNames = map(fields, it => isString(it) ? it : it.name),
                colFieldNames = this.calcFieldNamesFromColumns(),
                missingFieldNames = difference(colFieldNames, storeFieldNames);

            // ID is always present on a Record, yet will never be listed within store.fields.
            pull(missingFieldNames, 'id');

            if (missingFieldNames.length) {
                store = {
                    ...store,
                    fields: [...fields, ...missingFieldNames]
                };
            }

            return this.markManaged(new Store(store));
        }

        throw XH.exception(
            'The GridModel.store config must be either a concrete instance of Store or a config to create one.');
    }

    calcFieldNamesFromColumns() {
        const ret = new Set();
        this.getLeafColumns().forEach(col => {
            let {fieldPath} = col;
            if (isNil(fieldPath)) return;

            // Handle dot-separated column fields, including the root of their path in the returned
            // list of field names. The resulting store field will hold the parent object.
            ret.add(isArray(fieldPath) ? fieldPath[0] : fieldPath);
        });

        return Array.from(ret);
    }

    parseSelModel(selModel) {
        selModel = withDefault(selModel, XH.isMobile ? 'disabled' : 'single');

        if (selModel instanceof StoreSelectionModel) {
            return selModel;
        }

        if (isPlainObject(selModel)) {
            return this.markManaged(new StoreSelectionModel(defaults(selModel,
                {store: this.store})));
        }

        // Assume its just the mode...
        let mode = 'single';
        if (isString(selModel)) {
            mode = selModel;
        } else if (selModel === null) {
            mode = 'disabled';
        }
        return this.markManaged(new StoreSelectionModel({mode, store: this.store}));
    }

    parseStateModel(stateModel) {
        let ret = null;
        if (isPlainObject(stateModel)) {
            ret = new GridStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new GridStateModel({gridId: stateModel});
        }
        if (ret) {
            ret.init(this);
            this.markManaged(ret);
        }
        return ret;
    }

    createChooserModel() {
        const Model = XH.isMobile ? MobileColChooserModel : DesktopColChooserModel;
        return this.markManaged(new Model(this));
    }

    defaultGroupSortFn = (a, b) => {
        return a < b ? -1 : (a > b ? 1 : 0);
    }

}

/**
 * @typedef {Object} ColumnState
 * @property {string} colId - unique identifier of the column
 * @property {number} [width] - new width to set for the column
 * @property {boolean} [hidden] - visibility of the column
 * @property {string} [pinned] - 'left'|'right' if pinned, null if not
 */

/**
 * @callback GridGroupSortFn - comparator for custom grid group sorting, provided to GridModel.
 * @param {*} groupAVal - first group value to be compared.
 * @param {*} groupBVal - second group value to be compared.
 * @param {string} groupField - field name being grouped at this level.
 * @param {Object} metadata - additional metadata with raw ag-Grid group nodes.
 * @param {GridModel} metadata.gridModel - controlling GridModel.
 * @param {RowNode} metadata.nodeA - first raw ag-Grid row node.
 * @param {RowNode} metadata.nodeB - second raw ag-Grid row node.
 * @returns {number} - 0 if group values are equal, <0 if `a` sorts first, >0 if `b` sorts first.
 */

/**
 * @callback GridStoreContextMenuFn - context menu factory function, provided to GridModel.
 * @param {GetContextMenuItemsParams} params - raw event params from ag-Grid
 * @param {GridModel} gridModel - controlling GridModel instance
 * @returns {StoreContextMenu} - context menu to display, or null
 */

/**
 * @callback RowClassFn - closure to generate CSS class names for a row.
 * @param {Object} data - the inner data object from the Record associated with the rendered row.
 * @returns {(String|String[])} - CSS class(es) to apply to the row level.
 */
