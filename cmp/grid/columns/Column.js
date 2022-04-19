/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, ul, li, span} from '@xh/hoist/cmp/layout';
import {XH} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {throwIf, warnIf, withDefault, apiRemoved} from '@xh/hoist/utils/js';
import {
    castArray,
    clone,
    find,
    get,
    isArray,
    isEmpty,
    isFinite,
    isFunction,
    isNil,
    isNumber,
    isPlainObject,
    isString,
    toString
} from 'lodash';
import {forwardRef, useImperativeHandle, createElement, isValidElement} from 'react';
import classNames from 'classnames';
import {GridSorter} from '../impl/GridSorter';
import {ExcelFormat} from './ExcelFormat';

/**
 * Cross-platform definition and API for a standardized Grid column.
 * Provided to GridModels as plain configuration objects.
 */
export class Column {

    static DEFAULT_WIDTH = 60;
    static FLEX_COL_MIN_WIDTH = 30;

    /**
     * A convenience sort order. Default for non-numeric, non-date columns.
     */
    static ASC_FIRST = [
        {sort: 'asc', abs: false},
        {sort: 'desc', abs: false}
    ];

    /**
     * A convenience sort order. Default for numeric and date columns.
     */
    static DESC_FIRST = [
        {sort: 'desc', abs: false},
        {sort: 'asc', abs: false}
    ];

    /**
     * A convenience sort order. Default for numeric and date columns where absSort: true.
     */
    static ABS_DESC_FIRST = [
        {sort: 'desc', abs: true},
        {sort: 'asc', abs: false},
        {sort: 'desc', abs: false}
    ];

    /** @member {string} - name of backing Store Field, if any. */
    field;
    /** @member {boolean} */
    enableDotSeparatedFieldPath
    /** @member {(string|string[])} */
    fieldPath;
    /** @member {string} */
    colId;
    /** @member {boolean} */
    isTreeColumn;

    /** @member {string} */
    displayName;
    /** @member {(Column~headerNameFn|element)} */
    headerName;
    /** @member {string} */
    headerTooltip;
    /** @member {boolean} */
    headerHasExpandCollapse;
    /** @member {string} */
    headerAlign;
    /** @member {(Column~headerClassFn|string|string[])} */
    headerClass;

    /** @member {(Column~cellClassFn|string|string[])} */
    cellClass
    /** @member {Object.<string, Column~cellClassRuleFn>} */
    cellClassRules;
    /** @member {string} */
    align;

    /** @member {boolean} */
    hidden;
    /** @member {boolean} */
    hideWhenGrouped;
    /** @member {boolean} */
    showWhenUngrouped;
    /** @member {(boolean|number)} */
    flex;
    /** @member {number} */
    width;
    /** @member {number} */
    minWidth;
    /** @member {number} */
    maxWidth;

    /** @member {number} */
    rowHeight;

    /** @member {{(string[]|Column~SortSpec[])}} */
    sortingOrder;
    /** @member {boolean} */
    absSort
    /** @member {(string|Column~sortValueFn)} */
    sortValue;
    /** @member {Column~comparatorFn} */
    comparator;

    /** @member {boolean} */
    resizable;
    /** @member {boolean} */
    sortable;
    /** @member {boolean} */
    movable;
    /** @member {boolean} */
    filterable;
    /** @member {boolean} */
    hideable;
    /** @member {string} */
    pinned;

    /** @member {Column~rendererFn} */
    renderer;
    /** @member {boolean} */
    rendererIsComplex;
    /** @member {boolean} */
    highlightOnChange;

    /** @member {(boolean|Column~tooltipFn)} */
    tooltip;
    /** @member {Column~tooltipElementFn} */
    tooltipElement;

    /** @member {string} */
    chooserName;
    /** @member {string} */
    chooserGroup;
    /** @member {string} */
    chooserDescription;
    /** @member {boolean} */
    excludeFromChooser;

    /** @member {string} */
    exportName
    /** @member {(string|Column~exportValueFn)} */
    exportValue;
    /** @member {boolean} */
    excludeFromExport;
    /** @member {(ExcelFormat|function)} */
    excelFormat;
    /** @member {number} */
    excelWidth;

    /** @member {boolean} */
    autosizable;
    /** @member {boolean} */
    autosizeIncludeHeader;
    /** @member {boolean} */
    autosizeIncludeHeaderIcons;
    /** @member {number} */
    autosizeMinWidth;
    /** @member {number} */
    autosizeMaxWidth;
    /** @member {number} */
    autosizeBufferPx;

    /** @member {boolean} */
    autoHeight;

    /** @member {(boolean|Column~editableFn)} */
    editable;
    /** @member {Column~editorFn} */
    editor;
    /** @member {boolean} */
    editorIsPopup;
    /** @member {Column~setValueFn} */
    setValueFn;
    /** @member {Column~getValueFn} */
    getValueFn;

    /** @member {GridModel} */
    gridModel;
    /** @member {Object} */
    agOptions;

    /**
     * @param {Object} c - Column configuration.
     * @param {(string|Object)} [c.field] - name of data store field to display within the column,
     *      or object containing properties for store field.  If object form is used, the provided
     *      properties will be used for auto-creating any fields needed on the Grid's store.
     * @param {string} [c.colId] - unique identifier for the Column within its grid.
     *      Defaults to field name - one of these two properties must be specified.
     * @param {boolean} [c.isTreeColumn] - true if this column will host the expand/collapse arrow
     *      controls for a hierarchical Tree Grid. For when `GridModel.treeMode` is enabled, one
     *      column in that grid should have this flag enabled.
     * @param {string} [c.displayName] - primary user-facing name for this Column. Sourced from
     *      the corresponding data `Field.displayName` from the parent `GridModel.store` config, if
     *      available, or defaulted via transform of `field` string config. Used as default value
     *      for more specialized `headerName`, `chooserName`, and `exportName` configs. See those
     *      configs for additional details and options they support.
     * @param {(Column~headerNameFn|element)} [c.headerName] - user-facing text/element displayed
     *      in the Column header, or a function to produce the same. Defaulted from `displayName`.
     * @param {string} [c.headerTooltip] - tooltip text for grid header.
     * @param {boolean} [c.headerHasExpandCollapse] - true if this column header will host an
     *      expand/collapse all icon. `Column.isTreeColumn` must be enabled. Defaults to true.
     * @param {string} [c.headerAlign] - horizontal alignment of header contents. Defaults to same
     *      as cell alignment.
     * @param {(Column~headerClassFn|string|string[])} [c.headerClass] - CSS classes to add to the
     *      header. Supports both string values or a function to generate strings.
     * @param {(Column~cellClassFn|string|string[])} [c.cellClass] - additional CSS classes to add
     *      to each cell in the column. Supports both string values or function to generate.
     *      NOTE that, once added, classes will *not* be removed if the data changes.
     *      Use `cellClassRules` instead if StoreRecord data can change across refreshes.
     * @param {Object.<string, Column~cellClassRuleFn>} [c.cellClassRules] - object keying CSS
     *      class names to functions determining if they should be added or removed from the cell.
     *      See Ag-Grid docs on "cell styles" for details.
     * @param {boolean} [c.hidden] - true to suppress default display of the column.
     * @param {boolean} [c.hideWhenGrouped] - true to hide column when grouped.
     * @param {boolean} [c.showWhenUngrouped] - true to show column when ungrouped.
     * @param {string} [c.align] - horizontal alignment of cell contents.
     *      Valid values are:  'left' (default), 'right' or 'center'.
     * @param {number} [c.width] - default width in pixels.
     * @param {number} [c.minWidth] - minimum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing below this value. (Note this is *not* a substitute for width.)
     * @param {number} [c.maxWidth] - maximum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing above this value.
     * @param {(boolean|number)} [c.flex] - flex columns stretch to fill the width of the grid
     *      after all columns with a set pixel-width have been sized. If multiple columns have a
     *      flex value set, their width will be set in proportion to their flex values. A flex value
     *      of `true` is equivalent to 1. Consider pairing a flex setting with min/max pixel widths
     *      to avoid your column being squeezed down to the default 50px minimum or stretching so
     *      wide that it compromises the overall legibility of the grid.
     * @param {number} [c.rowHeight] - row height required by column in pixels - grids can use this
     *      to determine an appropriate row height when the column is visible.
     * @param {(string[]|Column~SortSpec[])} [c.sortingOrder] - the sorting options for this column
     *      to be applied by successive clicks on the column header. Values may be one of 'asc',
     *      'desc', a SortSpec, or null. Specify null to clear the sort on this column.
     * @param {boolean} [c.absSort] - true to enable absolute value sorting for this column.  If
     *      false (default) absolute value sorts will be ignored when cycling through the
     *     sortingOrder.
     * @param {(string|Column~sortValueFn)} [c.sortValue] - alternate field name to reference or
     *      function to call when producing a value for this column to be sorted by.
     * @param {Column~comparatorFn} [c.comparator] - function to comparing cell values for sorting.
     * @param {boolean} [c.resizable] - false to prevent user from drag-and-drop resizing.
     * @param {boolean} [c.movable] - false to prevent user from drag-and-drop re-ordering.
     * @param {boolean} [c.sortable] - false to prevent user from sorting on this column.
     * @param {boolean} [c.filterable] - true to enable an Excel-like column header filter menu.
     *      Menu option defaults vary based on the underlying Field.type, but include a
     *      checkbox-list "values filter" and a custom input filter for more complex queries.
     * @param {boolean} [c.hideable] - false to always show column. Will appear in column chooser
     *       but always locked in the displayed collection of columns.
     * @param {(boolean|string)} [c.pinned] - set to true/'left' or 'right' to pin (aka "lock") the
     *      column to the side of the grid, ensuring it's visible while horizontally scrolling.
     * @param {Column~rendererFn} [c.renderer] - function returning a React Element for each
     *      cell value in this Column.
     * @param {boolean} [c.rendererIsComplex] - true if this renderer relies on more than
     *      just the value of the field associated with this column. Set to true to ensure that
     *      the cells for this column are updated any time the record is changed, but note this can
     *      negatively affect update performance. Default false.
     * @param {boolean} highlightOnChange - set to true to call attention to cell changes by
     *      flashing the cell's background color. Note: incompatible with rendererIsComplex.
     * @param {(boolean|Column~tooltipFn)} [c.tooltip] - 'true' displays the raw value, or
     *      tooltip function, which is based on AG Grid tooltip callback. Incompatible with
     *      `tooltipElement`.
     * @param {Column~tooltipElementFn} [c.tooltipElement] - function which returns a React
     *     component to display as a tooltip. Will take precedence over `tooltip`.
     * @param {string} [c.chooserName] - name to display within the column chooser component.
     *      Defaults to `displayName`, can be longer / less abbreviated than `headerName` might be.
     * @param {string} [c.chooserGroup] - group name to display within the column chooser
     *     component.
     *      Chooser will automatically group its "available columns" grid if any cols provide.
     * @param {string} [c.chooserDescription] - additional descriptive text to display within the
     *      column chooser. Appears when the column is selected within the chooser UI.
     * @param {boolean} [c.excludeFromChooser] - true to hide the column from the column chooser
     *      completely. Useful for hiding structural columns the user is not expected to adjust.
     * @param {string} [c.exportName] - name to use as a header within a file export. Defaults to
     *      `headerName`. Useful when `headerName` contains markup or other characters not suitable
     *      for use within an Excel or CSV file header.
     * @param {(string|Column~exportValueFn)} [c.exportValue] - alternate field name to reference or
     *      function to call when producing a value for a file export. {@see GridExportService}
     * @param {(ExcelFormat|function)} [c.excelFormat] - structured format string for Excel-based
     *      exports, or a function to produce one. {@see ExcelFormat}
     * @param {number} [c.excelWidth] - width in characters for Excel-based exports. Typically
     *     used with ExcelFormat.LONG_TEXT to enable text wrapping.
     * @param {boolean} [c.excludeFromExport] - true to drop this column from a file export.
     * @param {boolean} [c.autosizable] - allow autosizing this column.
     * @param {boolean} [c.autosizeIncludeHeader] - true to include the header width when
     *     autosizing.
     * @param {boolean} [c.autosizeIncludeHeaderIcons] - true to always include the width of the
     *     sort icon when calculating the header width.
     * @param {number} [c.autosizeMinWidth] - minimum width in pixels when autosizing.
     * @param {number} [c.autosizeMaxWidth] - maximum width in pixels when autosizing.
     * @param {number} [c.autosizeBufferPx] - additional pixels to add to the size of each column
     *      beyond its absolute minimum. If specified, it will override the value of
     *      `GridAutosizeOptions.bufferPx` which is applied to all columns.
     * @param {boolean} [c.autoHeight] - true to dynamically grow the row height based on the
     *      content of this column's cell.  If true, text will also be set to wrap within cells.
     * @param {(boolean|Column~editableFn)} [c.editable] - true to make cells in this column
     *     editable, or a function to determine on a record-by-record basis.
     * @param {Column~editorFn} [c.editor] - Cell editor Component or a function to create one.
     *      Adding an editor will also install a cellClassRule and tooltip to display the
     *      validation state of the cell in question.
     * @param {boolean} [c.editorIsPopup] - true if this cell editor should be rendered as a popup
     *      over the cell instead of within the actual cell element. Popup editors will have their
     *      width set to match the cell by default. Typically used with textarea cell editors.
     * @param {Column~setValueFn} [c.setValueFn] - function for updating StoreRecord field for this
     *      column after inline editing.
     * @param {Column~getValueFn} [c.getValueFn] - function for getting the column value
     * @param {boolean} [c.enableDotSeparatedFieldPath] - true (default) to enable configuration
     *      of field name as a dot-separated path - e.g. `'country.name'` - where the default
     *      `getValueFn` will expect the field to be an object and render a nested property.
     *      False to support field names that contain dots *without* triggering this behavior.
     * @param {Object} [c.agOptions] - "escape hatch" object to pass directly to Ag-Grid for
     *      desktop implementations. Note these options may be used / overwritten by the framework
     *      itself, and are not all guaranteed to be compatible with its usages of Ag-Grid.
     *      @see {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     * @param {...*} [rest] - additional properties to store on the column
     * @param {GridModel} gridModel - the model which owns this column.
     */
    constructor({
        field,
        colId,
        isTreeColumn,
        displayName,
        headerName,
        headerTooltip,
        headerHasExpandCollapse,
        headerAlign,
        headerClass,
        cellClass,
        cellClassRules,
        hidden,
        hideWhenGrouped,
        showWhenUngrouped,
        align,
        width,
        minWidth,
        maxWidth,
        flex,
        rowHeight,
        absSort,
        sortingOrder,
        sortValue,
        comparator,
        resizable,
        movable,
        sortable,
        filterable,
        pinned,
        renderer,
        rendererIsComplex,
        highlightOnChange,
        chooserName,
        chooserGroup,
        chooserDescription,
        excludeFromChooser,
        hideable,
        exportName,
        exportValue,
        excludeFromExport,
        excelFormat,
        excelWidth,
        autosizable,
        autosizeIncludeHeader,
        autosizeIncludeHeaderIcons,
        autosizeMinWidth,
        autosizeMaxWidth,
        autosizeBufferPx,
        autoHeight,
        tooltip,
        tooltipElement,
        editable,
        editor,
        editorIsPopup,
        setValueFn,
        getValueFn,
        enableDotSeparatedFieldPath,
        agOptions,
        ...rest
    }, gridModel) {
        Object.assign(this, rest);

        this.field = this.parseField(field);
        this.enableDotSeparatedFieldPath = withDefault(enableDotSeparatedFieldPath, true);
        if (this.field) {
            const splitFieldPath = this.enableDotSeparatedFieldPath && this.field.includes('.');
            this.fieldPath = splitFieldPath ? this.field.split('.') : this.field;
        }

        this.colId = colId || this.field;
        throwIf(!this.colId, 'Must specify colId or field for a Column.');

        this.isTreeColumn = withDefault(isTreeColumn, false);

        // Note that parent GridModel might have already defaulted displayName from an associated
        // `Store.field` when pre-processing Column configs - prior to calling this ctor. If that
        // hasn't happened, displayName will still always be defaulted to a fallback based on colId.
        this.displayName = displayName ?? this.fieldSpec?.displayName ?? genDisplayName(this.colId);

        // In contrast, headerName supports a null or '' value when no header label is desired.
        this.headerName = withDefault(headerName, this.displayName);

        this.headerTooltip = headerTooltip;
        this.headerHasExpandCollapse = withDefault(headerHasExpandCollapse, true);
        this.headerAlign = headerAlign || align;
        this.headerClass = headerClass;

        this.cellClass = cellClass;
        this.cellClassRules = cellClassRules || {};

        this.align = align;

        this.hidden = withDefault(hidden, false);
        this.hideWhenGrouped = withDefault(hideWhenGrouped, true);
        this.showWhenUngrouped = withDefault(showWhenUngrouped, false);
        warnIf(rest.hide, `Column ${this.colId} configured with {hide: true} - use "hidden" instead.`);

        warnIf(
            flex && width,
            `Column specified with both flex && width. Width will be ignored. [colId=${this.colId}]`
        );
        warnIf(
            width && !isFinite(width),
            `Column width not specified as a number. Default width will be applied. [colId=${this.colId}]`
        );

        this.flex = withDefault(flex, false);
        this.width = this.flex ? null : (width && isFinite(width) ? width : Column.DEFAULT_WIDTH);
        // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
        this.minWidth = withDefault(minWidth, this.flex ? Column.FLEX_COL_MIN_WIDTH : null);
        this.maxWidth = maxWidth;

        this.rowHeight = rowHeight;

        this.absSort = withDefault(absSort, false);
        this.sortingOrder = sortingOrder;
        this.sortValue = sortValue;
        this.comparator = comparator;

        this.resizable = withDefault(resizable, true);
        this.sortable = withDefault(sortable, true);
        this.movable = withDefault(movable, true);
        this.filterable = this.parseFilterable(filterable);
        this.hideable = withDefault(hideable, !this.isTreeColumn);
        this.pinned = this.parsePinned(pinned);

        apiRemoved('Column.elementRenderer', {test: rest.elementRenderer, msg: 'Use `renderer` instead', v: 48});
        this.renderer = renderer;
        this.rendererIsComplex = rendererIsComplex;
        this.highlightOnChange = highlightOnChange;
        warnIf(
            rendererIsComplex && highlightOnChange,
            'Specifying both renderIsComplex and highlightOnChange is not supported. Cells will be force-refreshed on all changes and always flash.'
        );

        this.tooltip = tooltip;
        this.tooltipElement = tooltipElement;
        warnIf(
            tooltip && tooltipElement,
            `Column specified with both tooltip && tooltipElement. Tooltip will be ignored. [colId=${this.colId}]`
        );

        this.chooserName = chooserName || this.displayName;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = withDefault(showWhenUngrouped && hidden ? false : excludeFromChooser, false);
        warnIf(showWhenUngrouped && hidden && excludeFromChooser,
            `Column "${this.colId}" cannot be configured with {hidden: true, excludeFromChooser: true} AND {showWhenUngrouped: true}. ExcludeFromChooser will be ignored.`
        );

        // ExportName must be non-empty string. Default to headerName if unspecified (it supports
        // the function form of headerName) and fallback to colId. Note GridExportService can
        // fallback again to colId internally if headerName is or returns an Element.
        this.exportName = exportName || this.headerName || this.colId;
        this.exportValue = exportValue;
        this.excludeFromExport = withDefault(excludeFromExport, !this.field);

        apiRemoved('Column.exportFormat', {test: rest.exportFormat, msg: 'Use `excelFormat` instead', v: 47});
        apiRemoved('Column.exportWidth', {test: rest.exportWidth, msg: 'Use `excelWidth` instead', v: 47});
        this.excelFormat = withDefault(excelFormat, ExcelFormat.DEFAULT);
        this.excelWidth = excelWidth ?? null;

        this.autosizable = withDefault(autosizable, this.resizable, true);
        this.autosizeIncludeHeader = withDefault(autosizeIncludeHeader, true);
        this.autosizeIncludeHeaderIcons = withDefault(autosizeIncludeHeaderIcons, true);
        this.autosizeMinWidth = withDefault(autosizeMinWidth, this.minWidth);
        this.autosizeMaxWidth = withDefault(autosizeMaxWidth, this.maxWidth);
        this.autosizeBufferPx = autosizeBufferPx;

        this.autoHeight = withDefault(autoHeight, false);

        this.editable = editable || false;
        this.editor = editor;
        this.editorIsPopup = editorIsPopup;
        this.setValueFn = withDefault(setValueFn, this.defaultSetValueFn);
        this.getValueFn = withDefault(getValueFn, this.defaultGetValueFn);

        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};

        // Warn if using the ag-Grid valueSetter or valueGetter and recommend using our callbacks
        warnIf(this.agOptions.valueSetter, `Column '${this.colId}' uses valueSetter through agOptions. Remove and use custom setValueFn if needed.`);
        warnIf(this.agOptions.valueGetter, `Column '${this.colId}' uses valueGetter through agOptions. Remove and use custom getValueFn if needed.`);
    }

    /**
     * @param {StoreRecord} record
     * @return {boolean} - true if this column supports editing its field for the given StoreRecord.
     */
    isEditableForRecord(record) {
        const {editable, gridModel} = this;
        if (!record) return false;
        return isFunction(editable) ?
            editable({record, store: record.store, gridModel, column: this}) :
            editable;
    }

    /** @return {Object} - a Column definition appropriate for AG-Grid. */
    getAgSpec() {
        const {gridModel, field, headerName, displayName, agOptions} = this,
            ret = {
                xhColumn: this,
                field,
                colId: this.colId,
                // headerValueGetter should always return a string
                // for display in draggable shadow box, aGrid Tool panel.
                // Hoist ColumnHeader will handle display of Element values in the header.
                headerValueGetter: (agParams) => {
                    let ret = isFunction(headerName) ? headerName({column: this, gridModel, agParams}) : headerName;
                    return isString(ret) ? ret : displayName;
                },
                headerClass: getAgHeaderClassFn(this),
                headerTooltip: this.headerTooltip,
                hide: this.hidden,
                minWidth: this.minWidth,
                maxWidth: this.maxWidth,
                resizable: this.resizable,
                sortable: false,   // Prevent ag-Grid built-in sorting affordances.  Our custom header provides.
                suppressMovable: !this.movable,
                lockPinned: !gridModel.enableColumnPinning || XH.isMobileApp,
                pinned: this.pinned,
                lockVisible: !this.hideable || !gridModel.colChooserModel || XH.isMobileApp,
                headerComponentParams: {gridModel, xhColumn: this},
                suppressColumnsToolPanel: this.excludeFromChooser,
                suppressFiltersToolPanel: this.excludeFromChooser,
                enableCellChangeFlash: this.highlightOnChange,
                cellClassRules: this.cellClassRules,
                editable: (agParams) => this.isEditableForRecord(agParams.node.data),
                valueSetter: (agParams) => {
                    const record = agParams.data;
                    this.setValueFn({
                        value: agParams.newValue,
                        record,
                        field,
                        store: record?.store,
                        column: this,
                        gridModel,
                        agParams
                    });
                },
                valueGetter: (agParams) => {
                    const record = agParams.data;
                    return this.getValueFn({
                        record,
                        field,
                        store: record?.store,
                        column: this,
                        gridModel,
                        agParams
                    });
                },
                suppressKeyboardEvent: ({editing, event}) => {
                    if (!editing) return false;

                    // Avoid stomping on react-select menus in editors
                    const {gridModel, colId} = this,
                        editor = gridModel.agApi.getCellEditorInstances({columns: [colId]})[0],
                        reactSelect = editor?.inputModel?.().reactSelect;
                    if (reactSelect?.state.menuIsOpen) return true;

                    // Allow shift+enter to add newlines in certain editors
                    if (event.shiftKey && event.key === 'Enter') return true;

                    return false;
                }
            };

        // We will change this setter as needed to install the renderer in the proper location
        // for cases like tree columns where we need to set the inner renderer on the default ag-Grid
        // group cell renderer, instead of on the top-level column itself
        let setRenderer = (r) => ret.cellRenderer = r;

        // Our implementation of Grid.getDataPath() > StoreRecord.treePath returns data path []s of
        // StoreRecord IDs. TreeColumns use those IDs as their cell values, regardless of field.
        // Add valueGetters below to correct + additional fixes for sorting below.
        if (this.isTreeColumn) {
            ret.showRowGroup = true;
            ret.cellRenderer = 'agGroupCellRenderer';
            ret.cellRendererParams = {
                suppressCount: true,
                suppressDoubleClickExpand: true
            };

            setRenderer = (r) => ret.cellRendererParams.innerRenderer = r;
        }

        // By always providing a minimal pass-through cellRenderer, we can ensure the
        // cell contents are wrapped in a span for styling purposes. We check agOptions in case
        // the dev has specified a renderer option directly against the ag-Grid API.
        const {renderer} = this;
        if (!agOptions.cellRenderer) {
            setRenderer((agParams) => {
                const ret = renderer ?
                    renderer(agParams.value, {record: agParams.data, column: this, gridModel, agParams}) :
                    agParams.value?.toString();

                // Add wrapping span for styling purposes
                return span({className: 'xh-cell-inner-wrapper', item: ret});
            });
        }

        // Tooltip Handling
        const {tooltip, tooltipElement, editor} = this,
            tooltipSpec = tooltipElement ?? tooltip;

        if (tooltipSpec || editor) {
            // ag-Grid requires a return from getter, but value we actually use is computed below
            ret.tooltipValueGetter = () => 'tooltip';
            ret.tooltipComponent = forwardRef((props, ref) => {
                const {location} = props;
                useImperativeHandle(ref, () => ({
                    getReactContainerClasses() {
                        if (location === 'header') return ['ag-tooltip'];
                        return ['xh-grid-tooltip', tooltipElement ? 'xh-grid-tooltip--custom' : 'xh-grid-tooltip--default'];
                    }
                }), [location]);

                const agParams = props,
                    {data: record} = agParams;

                if (location === 'header') return div(this.headerTooltip);

                if (!record?.isRecord) return null;

                // Override with validation errors, if present
                if (editor) {
                    const errors = record.errors[field];
                    if (!isEmpty(errors)) {
                        return ul({
                            className: classNames(
                                'xh-grid-tooltip--validation',
                                errors.length === 1 ? 'xh-grid-tooltip--validation--single' : null
                            ),
                            items: errors.map((it, idx) => li({key: idx, item: it}))
                        });
                    }
                    if (!tooltipSpec) return null;
                }

                const {store} = record,
                    val = this.getValueFn({record, column: this, gridModel, agParams, store});

                const ret = isFunction(tooltipSpec) ?
                    tooltipSpec(val, {record, column: this, gridModel, agParams}) :
                    val;

                return isValidElement(ret) ? ret : toString(ret);
            });
        }

        // Generate CSS classes for cells.
        // Default alignment classes are mixed in with any provided custom classes.
        const {cellClass, isTreeColumn, align} = this;
        ret.cellClass = (agParams) => {
            let r = [];
            if (cellClass) {
                r = castArray(
                    isFunction(cellClass) ?
                        cellClass(agParams.value, {record: agParams.data, column: this, gridModel, agParams}) :
                        cellClass
                );
            }
            if (isTreeColumn) {
                r.push('xh-tree-column');
            }
            if (align === 'center' || align === 'right') {
                r.push('xh-align-' + align);
            }
            return r;
        };

        if (this.flex) {
            ret.resizable = false;
            ret.flex = isNumber(this.flex) ? this.flex : 1;
        } else {
            ret.suppressSizeToFit = true;
            ret.width = this.width;
        }

        const sortCfg = find(gridModel.sortBy, {colId: ret.colId});
        if (sortCfg) {
            ret.sort = sortCfg.sort;
            ret.sortIndex = gridModel.sortBy.indexOf(sortCfg);
        }

        if (this.comparator === undefined) {
            // Use default comparator with appropriate inputs
            ret.comparator = (valueA, valueB, agNodeA, agNodeB) => {
                const recordA = agNodeA?.data,
                    recordB = agNodeB?.data;

                valueA = this.getSortValue(valueA, recordA);
                valueB = this.getSortValue(valueB, recordB);

                return this.defaultComparator(valueA, valueB);
            };
        } else {
            // ...or process custom comparator with the Hoist-defined comparatorFn API.
            ret.comparator = (valueA, valueB, agNodeA, agNodeB) => {
                const {gridModel, colId} = this,
                    // Note: sortCfg and agNodes can be undefined if comparator called during show
                    // of agGrid column header set filter menu.
                    sortCfg = find(gridModel.sortBy, {colId}),
                    sortDir = sortCfg?.sort || 'asc',
                    abs = sortCfg?.abs || false,
                    recordA = agNodeA?.data,
                    recordB = agNodeB?.data,
                    params = {
                        recordA,
                        recordB,
                        column: this,
                        gridModel,
                        defaultComparator: (a, b) => this.defaultComparator(a, b),
                        agNodeA,
                        agNodeB
                    };

                valueA = this.getSortValue(valueA, recordA);
                valueB = this.getSortValue(valueB, recordB);

                return this.comparator(valueA, valueB, sortDir, abs, params);
            };
        }

        if (this.autoHeight) {
            ret.autoHeight = true;
            ret.wrapText = true;
        }

        if (editor) {
            ret.cellEditor = forwardRef((agParams, ref) => {
                const props = {
                    record: agParams.data,
                    gridModel,
                    column: this,
                    agParams,
                    ref
                };
                // Can be a component or elem factory/ ad-hoc render function.
                if (editor.isHoistComponent) return createElement(editor, props);
                if (isFunction(editor)) return editor(props);
                throw XH.exception('Column editor must be a HoistComponent or a render function');
            });
            ret.cellEditorPopup = this.editorIsPopup;
            ret.cellClassRules = {
                'xh-cell--invalid': (agParams) => {
                    const record = agParams.data;
                    return record && !isEmpty(record.errors[field]);
                },
                'xh-cell--editable': (agParams) => {
                    return this.isEditableForRecord(agParams.data);
                },
                ...ret.cellClassRules
            };
        }

        // Finally, apply explicit app requests.  The customer is always right....
        return {...ret, ...agOptions};
    }

    //--------------------
    // Implementation
    //--------------------
    // Default comparator sorting to absValue-aware GridSorters in GridModel.sortBy[].
    defaultComparator = (v1, v2) => {
        const sortCfg = find(this.gridModel.sortBy, {colId: this.colId});
        return sortCfg ? sortCfg.comparator(v1, v2) : GridSorter.defaultComparator(v1, v2);
    };

    defaultSetValueFn = ({value, record, store, field}) => {
        const data = {id: record.id};
        data[field] = value;
        store.modifyRecords(data);
    };

    defaultGetValueFn = ({record}) => {
        const {fieldPath} = this;
        if (!record || isNil(fieldPath)) return '';

        if (isArray(fieldPath)) return get(record.data, fieldPath);
        return record.data[fieldPath];
    };

    parseField(field) {
        if (isPlainObject(field)) {
            this.fieldSpec = field;
            return field.name;
        }
        return field;
    }

    parsePinned(pinned) {
        if (pinned === true) return 'left';
        if (pinned === 'left' || pinned === 'right') return pinned;
        return null;
    }

    parseFilterable(filterable) {
        if (!filterable) return false;

        if (XH.isMobileApp) {
            console.warn(`'filterable' is not supported on mobile and will be ignored.`);
            return false;
        }

        if (!this.field) {
            console.warn(`Column '${this.colId}' is not a Store field. 'filterable' will be ignored.`);
            return false;
        }

        if (this.field === 'cubeLabel') {
            console.warn(`Column '${this.colId}' is a cube label column. 'filterable' will be ignored.`);
            return false;
        }

        return true;
    }

    getSortValue(v, record) {
        const {sortValue, gridModel} = this;
        if (!sortValue) return v;

        return isFunction(sortValue) ?
            sortValue(v, {record, column: this, gridModel}) :
            record?.data[sortValue] ?? v;
    }

}

/**
 * @param {Column} column
 * @return {function(*): string[]}
 */
export function getAgHeaderClassFn(column) {
    // Generate CSS classes for headers.
    // Default alignment classes are mixed in with any provided custom classes.
    const {headerClass, headerAlign, gridModel} = column;
    return (agParams) => {
        let r = [];
        if (headerClass) {
            r = castArray(
                isFunction(headerClass) ?
                    headerClass({column, gridModel, agParams}) :
                    headerClass
            );
        }

        if (headerAlign === 'center' || headerAlign === 'right') {
            r.push('xh-column-header-align-' + headerAlign);
        }

        return r;
    };
}

/**
 * @callback Column~comparatorFn - sort comparator function for a grid column. Note that this
 *      comparator will also be called if agGrid-provided column filtering is enabled: it is used
 *      to sort values shown for set filter options. In that case, some extra params will be null.
 * @param {*} valueA - cell data valueA to be compared
 * @param {*} valueB - cell data valueB to be compared
 * @param {string} sortDir - either 'asc' or 'desc'
 * @param {boolean} abs - true to sort by absolute value
 * @param {Object} params - extra parameters devs might want
 * @param {?StoreRecord} params.recordA - data record for valueA
 * @param {?StoreRecord} params.recordB - data record for valueB
 * @param {?Object} params.agNodeA - row node provided by ag-grid
 * @param {?Object} params.agNodeB - row node provided by ag-grid
 * @param {Column} params.column - column for the cell being rendered
 * @param {GridModel} params.gridModel - gridModel for the grid
 * @param {function} params.defaultComparator - default comparator provided by Hoist for this
 *     column. accepts two arguments: (a, b)
 */

/**
 * @callback Column~rendererFn - renderer function for a grid cell.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 *      Note that columns with renderers that access/rely on record fields other than the primary
 *      value should also have their `rendererIsComplex` flag set to true to ensure they are
 *      re-run whenever the record (and not just the primary value) changes.
 * @return {Element} - the formatted value for display.
 */

/**
 * @callback Column~exportValueFn - function to return a value for export.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 * @return {*} - value for export.
 */

/**
 * @callback Column~sortValueFn - function to return a value for sorting.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 * @return {*} - value for sort.
 */

/**
 * @callback Column~cellClassFn - function to generate grid cell CSS classes.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 * @return {(string|string[])} - CSS class(es) to use.
 */

/**
 * @callback Column~cellClassRuleFn - function to determine if a particular CSS class should be
 *      added/removed from a cell, via cellClassRules config.
 * @param {CellClassParams} agParams - as provided by Ag-Grid.
 * @param {*} agParams.value - the current cell value.
 * @param {?StoreRecord} agParams.data - the backing Hoist record for the row, if any.
 * @return {boolean} - true if the class to which this function is keyed should be added, false if
 *      it should be removed.
 */

/**
 * @callback Column~headerClassFn - function to generate header CSS classes.
 * @param {HeaderContext} context - contains data about the column and GridModel.
 * @return {(string|string[])} - CSS class(es) to use.
 */

/**
 * @typedef {Object} CellContext
 * @property {StoreRecord} record - row-level data record.
 * @property {Column} column - column for the cell being rendered.
 * @property {GridModel} gridModel - gridModel for the grid.
 * @property {ICellRendererParams} [agParams] - the ag-grid cell renderer params.
 */

/**
 * @typedef {Object} HeaderContext
 * @property {Column} column - column for the header being rendered.
 * @property {GridModel} gridModel - gridModel for the grid.
 * @property {ICellRendererParams} [agParams] - the ag-grid header renderer params.
 */

/**
 * @callback Column~tooltipFn - normalized renderer function to produce a grid column tooltip.
 * @param {*} value - cell data value (column + row).
 * @param {TooltipMetadata} metadata - additional data about the column and row.
 * @return {string} - the formatted value for display.
 */

/**
 * @typedef {Object} TooltipMetadata
 * @property {StoreRecord} record - row-level data record.
 * @property {Column} column - column for the cell being rendered.
 * @property {GridModel} gridModel - gridModel for the grid.
 * @property {ITooltipParams} [agParams] - the ag-grid tooltip params.
 */

/**
 * @callback Column~tooltipElementFn - function for a grid cell tooltip returning a React element.
 * @param {*} value - tooltip value.
 * @param {TooltipMetadata} metadata - additional data about the column and row.
 * @return {Element} - the React element to show as a tooltip.
 */

/**
 * @callback Column~headerNameFn - function to generate a Column header name.
 *      Note that using function for the header name will ignore any ag-Grid functionality for
 *      decorating the header name, the return value of the function will be used as-is.
 *      The function should be treated like an autorun - any subsequent changes to observable
 *      properties referenced during the previous execution of the function will trigger a re-render
 *      of the column header.
 * @param {Column} [column] - column for the header name being generated.
 * @param {ColumnGroup} [columnGroup] - column group for the header name being generated.
 * @param {GridModel} gridModel - gridModel for the grid.
 * @param {Object} [agParams] - the ag-Grid header value getter params. Not present when called
 *      during ColumnHeader rendering.
 * @return {element} - the header name to render in the Column header
 */

/**
 * @callback Column~editableFn - function to determine if a Column should be editable or not.
 *      This function will be called whenever the user takes some action which would initiate inline
 *      editing of a cell before the actual inline editing session is started.
 * @param {Object} params
 * @param {StoreRecord} params.record - row-level data record.
 * @param {Store} params.store - Store containing the grid data.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @return {boolean} - true if cell is editable
 */

/**
 * @callback Column~editorFn - grid cell editor component, or function to return one.
 *      This value will be used to create a new Component whenever editing is initiated on a cell.
 * @param {Object} params
 * @param {StoreRecord} params.record - row-level data record.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @return {Element} - the React element to use as the cell editor.
 */

/**
 * @callback Column~setValueFn - function to update the value of a StoreRecord field after inline editing
 * @param {Object} params
 * @param {*} params.value - the new value for the field.
 * @param {StoreRecord} params.record - row-level data record.
 * @param {Store} params.store - Store containing the grid data.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @param {ValueSetterParams} [params.agParams] - the ag-Grid value setter params.
 */

/**
 * @callback Column~getValueFn - function to get the value of a StoreRecord field
 * @param {Object} params
 * @param {StoreRecord} params.record - row-level data record.
 * @param {string} params.field - name of data store field displayed in the column.
 * @param {Store} params.store - Store containing the grid data.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @param {ValueGetterParams} [params.agParams] - the ag-Grid value getter params.
 */

/**
 * @typedef {Object} Column~SortSpec - specifies how to perform sorting in a given column
 * @param {string} sort - direction to sort, either 'asc' or 'desc', or null to remove sort.
 * @param {boolean} [abs] - true to sort by absolute value
 */

