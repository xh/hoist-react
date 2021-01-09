/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {XH} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {castArray, clone, find, get, isArray, isFinite, isFunction, isNil, isNumber, isString} from 'lodash';
import {Component} from 'react';
import {GridSorter} from '../impl/GridSorter';
import {ExportFormat} from './ExportFormat';

/**
 * Cross-platform definition and API for a standardized Grid column.
 * Provided to GridModels as plain configuration objects.
 */
export class Column {

    static DEFAULT_WIDTH = 60;
    static FLEX_COL_MIN_WIDTH = 30;

    /**
     * The default sorting order to be used for columns with sorting enabled.
     * Change here for global change, otherwise use sortingOrder prop on column.
     *
     * Note that values with abs: true will be ignored for columns that do not
     * support absolute value sorting.  See Column.absSort.
     */
    static DEFAULT_SORTING_ORDER = [
        {sort: 'desc', abs: true},
        {sort: 'asc', abs: false},
        {sort: 'desc', abs: false}
    ];

    /**
     * @param {Object} c - Column configuration.
     * @param {string} [c.field] - name of data store field to display within the column.
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
     * @param {(Column~headerClassFn|string|string[])} [c.headerClass] - CSS classes to add to the
     *      header. Supports both string values or a function to generate strings.
     * @param {(Column~cellClassFn|string|string[])} [c.cellClass] - additional css classes to add
     *      to each cell in the column. Supports both string values or function to generate
     *     strings.
     * @param {boolean} [c.hidden] - true to suppress default display of the column.
     * @param {string} [c.align] - horizontal alignment of cell contents.
     *      Valid values are:  'left' (default), 'right' or 'center'.
     * @param {string} [c.headerAlign] - horizontal alignment of header contents. Defaults to same
     *      as cell alignment.
     * @param {number} [c.width] - default width in pixels.
     * @param {number} [c.minWidth] - minimum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing below this value. (Note this is *not* a substitute for width.)
     * @param {number} [c.maxWidth] - maximum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing above this value.
     * @param {(boolean|number)} [c.flex] - flex columns stretch to fill the width of the grid
     *     after
     *      all columns with a set pixel-width have been sized. If multiple columns have a flex
     *      value set, their width will be set in proportion to their flex values. A flex value
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
     * @param {Column~comparatorFn} [c.comparator] - function for comparing column values for
     *     sorting
     * @param {boolean} [c.resizable] - false to prevent user from drag-and-drop resizing.
     * @param {boolean} [c.movable] - false to prevent user from drag-and-drop re-ordering.
     * @param {boolean} [c.sortable] - false to prevent user from sorting on this column.
     * @param {(boolean|string)} [c.pinned] - set to true/'left' or 'right' to pin (aka "lock") the
     *      column to the side of the grid, ensuring it's visible while horizontally scrolling.
     * @param {Column~rendererFn} [c.renderer] - function returning a formatted string for each
     *      cell value in this Column. May return HTML, as this will be rendered by ag-Grid.
     * @param {Column~elementRendererFn} [c.elementRenderer] - function returning a React Component
     *      for each cell value in this Column. For use when a Component is required to render or
     *      encapsulate logic not easily achieved by a simpler `renderer` function returning a
     *      string. Use with care - this can have a noticeable performance impact on larger grids!
     * @param {string} [c.chooserName] - name to display within the column chooser component.
     *      Defaults to `displayName`, can be longer / less abbreviated than `headerName` might be.
     * @param {string} [c.chooserGroup] - group name to display within the column chooser
     *     component.
     *      Chooser will automatically group its "available columns" grid if any cols provide.
     * @param {string} [c.chooserDescription] - additional descriptive text to display within the
     *      column chooser. Appears when the column is selected within the chooser UI.
     * @param {boolean} [c.excludeFromChooser] - true to hide the column from the column chooser
     *      completely. Useful for hiding structural columns the user is not expected to adjust.
     * @param {boolean} [c.hideable] - false to always show column. Will appear in column chooser
     *       but always locked in the displayed collection of columns.
     * @param {string} [c.exportName] - name to use as a header within a file export. Defaults to
     *      `headerName`. Useful when `headerName` contains markup or other characters not suitable
     *      for use within an Excel or CSV file header.
     * @param {(string|function)} [c.exportValue] - alternate field name to reference or function
     *      to call when producing a value for a file export. {@see GridExportService}
     * @param {(ExportFormat|function)} [c.exportFormat] - structured format string for Excel-based
     *      exports, or a function to produce one. {@see ExportFormat}
     * @param {number} [c.exportWidth] - width in characters for Excel-based exports. Typically
     *     used with ExportFormat.LONG_TEXT to enable text wrapping.
     * @param {(boolean|Column~tooltipFn)} [c.tooltip] - 'true' displays the raw value, or
     *      tooltip function, which is based on AG Grid tooltip callback. Incompatible with
     *      `tooltipElement`.
     * @param {Column~tooltipElementFn} [c.tooltipElement] - function which returns a React
     *     component to display as a tooltip. Will take precedence over `tooltip`.
     * @param {boolean} [c.excludeFromExport] - true to drop this column from a file export.
     * @param {boolean} [c.autosizable] - allow autosizing this column.
     * @param {boolean} [c.autosizeIncludeHeader] - true to include the header width when
     *     autosizing.
     * @param {boolean} [c.autosizeIncludeHeaderIcons] - true to always include the width of the
     *     sort icon when calculating the header width.
     * @param {number} [c.autosizeMinWidth] - minimum width in pixels when autosizing.
     * @param {number} [c.autosizeMaxWidth] - maximum width in pixels when autosizing.
     * @param {boolean} [c.rendererIsComplex] - true if this renderer relies on more than
     *      just the value of the field associated with this column.  Set to true to ensure that
     *      the cells for this column are updated any time the record is changed.  Setting to true
     *      may have performance implications. Default false.
     * @param {boolean} highlightOnChange - set to true to call attention to cell changes by
     *      flashing the cell's background color. Note: incompatible with rendererIsComplex.
     * @param {boolean|Column~editableFn} [c.editable] - true to make cells in this column
     *     editable.
     * @param {Column~setValueFn} [c.setValueFn] - function for updating Record field for this
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
        headerClass,
        cellClass,
        hidden,
        align,
        headerAlign,
        width,
        minWidth,
        maxWidth,
        flex,
        rowHeight,
        absSort,
        sortingOrder,
        comparator,
        resizable,
        movable,
        sortable,
        pinned,
        renderer,
        rendererIsComplex,
        highlightOnChange,
        elementRenderer,
        chooserName,
        chooserGroup,
        chooserDescription,
        excludeFromChooser,
        hideable,
        exportName,
        exportValue,
        exportFormat,
        exportWidth,
        excludeFromExport,
        autosizable,
        autosizeIncludeHeader,
        autosizeIncludeHeaderIcons,
        autosizeMinWidth,
        autosizeMaxWidth,
        tooltip,
        tooltipElement,
        editable,
        setValueFn,
        getValueFn,
        enableDotSeparatedFieldPath,
        agOptions,
        ...rest
    }, gridModel) {
        Object.assign(this, rest);

        this.field = field;
        this.enableDotSeparatedFieldPath = withDefault(enableDotSeparatedFieldPath, true);
        if (field) {
            const splitFieldPath = this.enableDotSeparatedFieldPath && field.includes('.');
            this.fieldPath = splitFieldPath ? field.split('.') : field;
        }

        this.colId = colId || field;
        throwIf(!this.colId, 'Must specify colId or field for a Column.');

        this.isTreeColumn = withDefault(isTreeColumn, false);

        // Note that parent GridModel might have already defaulted displayName from an associated
        // `Store.field` when pre-processing Column configs - prior to calling this ctor. If that
        // hasn't happened, displayName will still always be defaulted to a fallback based on colId.
        this.displayName = displayName || genDisplayName(this.colId);

        // In contrast, headerName supports a null or '' value when no header label is desired.
        this.headerName = withDefault(headerName, this.displayName);

        this.headerTooltip = headerTooltip;
        this.headerClass = headerClass;
        this.cellClass = cellClass;
        this.align = align;
        this.headerAlign = headerAlign || align;

        this.hidden = withDefault(hidden, false);
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

        this.rowHeight = rowHeight;

        // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
        this.minWidth = withDefault(minWidth, this.flex ? Column.FLEX_COL_MIN_WIDTH : null);
        this.maxWidth = maxWidth;

        this.absSort = withDefault(absSort, false);
        this.sortingOrder = withDefault(sortingOrder, Column.DEFAULT_SORTING_ORDER);
        this.comparator = comparator;

        this.resizable = withDefault(resizable, true);
        this.movable = withDefault(movable, true);
        this.sortable = withDefault(sortable, true);

        // Pinned supports convenience true -> 'left'. OK to leave undefined if not given.
        this.pinned = (pinned === true) ? 'left' : pinned;

        this.renderer = renderer;
        this.elementRenderer = elementRenderer;
        this.rendererIsComplex = rendererIsComplex;
        this.highlightOnChange = highlightOnChange;
        warnIf(
            rendererIsComplex && highlightOnChange,
            'Specifying both renderIsComplex and highlightOnChange is not supported. Cells will be force-refreshed on all changes and always flash.'
        );

        this.chooserName = chooserName || this.displayName;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = withDefault(excludeFromChooser, false);
        this.hideable = withDefault(hideable, !this.isTreeColumn);

        // ExportName must be non-empty string. Default to headerName if unspecified (it supports
        // the function form of headerName) and fallback to colId. Note GridExportService can
        // fallback again to colId internally if headerName is or returns an Element.
        this.exportName = exportName || this.headerName || this.colId;
        this.exportValue = exportValue;
        this.exportFormat = withDefault(exportFormat, ExportFormat.DEFAULT);
        this.exportWidth = exportWidth || null;
        this.excludeFromExport = withDefault(excludeFromExport, !field);

        this.autosizable = withDefault(autosizable, this.resizable, true);
        this.autosizeIncludeHeader = withDefault(autosizeIncludeHeader, true);
        this.autosizeIncludeHeaderIcons = withDefault(autosizeIncludeHeaderIcons, true);
        this.autosizeMinWidth = withDefault(autosizeMinWidth, this.minWidth);
        this.autosizeMaxWidth = withDefault(autosizeMaxWidth, this.maxWidth);

        this.tooltip = tooltip;
        this.tooltipElement = tooltipElement;
        warnIf(
            tooltip && tooltipElement,
            `Column specified with both tooltip && tooltipElement. Tooltip will be ignored. [colId=${this.colId}]`
        );

        this.editable = editable;
        this.setValueFn = withDefault(setValueFn, this.defaultSetValueFn);
        this.getValueFn = withDefault(getValueFn, this.defaultGetValueFn);

        this.gridModel = gridModel;
        this.agOptions = agOptions ? clone(agOptions) : {};

        // Warn if using the ag-Grid valueSetter or valueGetter and recommend using our callbacks
        warnIf(this.agOptions.valueSetter, `Column '${this.colId}' uses valueSetter through agOptions. Remove and use custom setValueFn if needed.`);
        warnIf(this.agOptions.valueGetter, `Column '${this.colId}' uses valueGetter through agOptions. Remove and use custom getValueFn if needed.`);
    }

    /**
     * Produce a Column definition appropriate for AG Grid.
     */
    getAgSpec() {
        const {gridModel, field, headerName, displayName, agOptions} = this,
            me = this,
            ret = {
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
                sortable: this.sortable,
                suppressMovable: !this.movable,
                lockPinned: !gridModel.enableColumnPinning || XH.isMobileApp,
                pinned: this.pinned,
                lockVisible: !this.hideable || !gridModel.colChooserModel || XH.isMobileApp,
                headerComponentParams: {gridModel, xhColumn: this},
                suppressColumnsToolPanel: this.excludeFromChooser,
                suppressFiltersToolPanel: this.excludeFromChooser,
                enableCellChangeFlash: this.highlightOnChange,
                editable: (agParams) => {
                    const {editable} = this;
                    if (isFunction(editable)) {
                        const record = agParams.node.data;
                        return editable({record, store: record.store, gridModel, column: this, agParams});
                    }

                    return editable;
                },
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
                }
            };

        // We will change these setters as needed to install the renderers in the proper location
        // for cases like tree columns where we need to set the inner renderer on the default ag-Grid
        // group cell renderer, instead of on the top-level column itself
        let setRenderer = (r) => ret.cellRenderer = r,
            setElementRenderer = (r) => ret.cellRendererFramework = r;

        // Our implementation of Grid.getDataPath() > Record.treePath returns data path []s of
        // Record IDs. TreeColumns use those IDs as their cell values, regardless of field.
        // Add valueGetters below to correct + additional fixes for sorting below.
        if (this.isTreeColumn) {
            ret.showRowGroup = true;
            ret.cellRenderer = 'agGroupCellRenderer';
            ret.cellRendererParams = {
                suppressCount: true,
                suppressDoubleClickExpand: true
            };

            setRenderer = (r) => ret.cellRendererParams.innerRenderer = r;
            setElementRenderer = (r) => {
                ret.cellRendererParams.innerRenderer = null;
                ret.cellRendererParams.innerRendererFramework = r;
            };
        }

        // Tooltip Handling
        const {tooltip, tooltipElement} = this,
            tooltipSpec = tooltipElement ?? tooltip;

        if (tooltipSpec) {
            ret.tooltipValueGetter = (obj) => {

                // We actually return the *record* itself, rather then ag-Grid's default escaped value.
                // We need it below, where it will be handled to class as a prop.
                // Note that we must always return a value - see hoist-react #2058, #2181
                return obj.data ?? '*EMPTY*';
            };
            ret.tooltipComponentFramework = class extends Component {
                getReactContainerClasses() {
                    if (this.props.location === 'header') return ['ag-tooltip'];
                    return ['xh-grid-tooltip', tooltipElement ? 'xh-grid-tooltip--custom' : 'xh-grid-tooltip--default'];
                }
                render() {
                    const agParams = this.props,
                        {location, value: record} = agParams;  // Value actually contains store record -- see above

                    if (location === 'header') return div(me.headerTooltip);

                    if (!record?.isRecord) return null;
                    const {store} = record,
                        val = me.getValueFn({record, column: me, gridModel, agParams, store});

                    const ret = isFunction(tooltipSpec) ?
                        tooltipSpec(val, {record, column: me, gridModel, agParams}) :
                        val;

                    // Always defend against returning undefined from render() - React will throw!
                    return ret ?? null;
                }
            };
        }

        // Generate CSS classes for cells.
        // Default alignment classes are mixed in with any provided custom classes.
        const {align} = this;
        ret.cellClass = (agParams) => {
            let r = [];
            if (this.cellClass) {
                r = castArray(
                    isFunction(this.cellClass) ?
                        this.cellClass(agParams.value, {record: agParams.data, column: this, gridModel, agParams}) :
                        this.cellClass
                );
            }
            if (this.isTreeColumn) {
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

        const {renderer, elementRenderer} = this;
        if (renderer) {
            setRenderer((agParams) => {
                return renderer(agParams.value, {record: agParams.data, column: this, gridModel, agParams});
            });
        } else if (elementRenderer) {
            setElementRenderer(class extends Component {
                render() {
                    const agParams = this.props,
                        {value, data: record} = agParams;
                    return elementRenderer(value, {record, column: me, gridModel, agParams});
                }

                refresh() {return false}
            });
        } else if (!agOptions.cellRenderer && !agOptions.cellRendererFramework) {
            // By always providing a minimal cell pass-through cellRenderer, we can ensure the
            // cell contents are wrapped in a span by Ag-Grid. Our flexbox enabled cell styling
            // requires all cells to have an inner element to work properly. We check agOptions
            // in case the dev has specified either renderer option directly against the ag-Grid
            // API (done sometimes with components for performance reasons).
            setRenderer((agParams) => agParams.value?.toString());
        }

        const sortCfg = find(gridModel.sortBy, {colId: ret.colId});
        if (sortCfg) {
            ret.sort = sortCfg.sort;
            ret.sortIndex = gridModel.sortBy.indexOf(sortCfg);
        }

        if (this.comparator === undefined) {
            // Default comparator sorting to absValue-aware GridSorters in GridModel.sortBy[].
            ret.comparator = this.defaultComparator;
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

                return this.comparator(valueA, valueB, sortDir, abs, params);
            };
        }

        // Finally, apply explicit app requests.  The customer is always right....
        return {...ret, ...agOptions};
    }

    //--------------------
    // Implementation
    //--------------------
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
}

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
 * @param {?Record} params.recordA - data Record for valueA
 * @param {?Record} params.recordB - data Record for valueB
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
 * @return {string} - the formatted value for display.
 */

/**
 * @callback Column~elementRendererFn - renderer function for a grid cell returning a React element.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 *      Note that columns with renderers that access/rely on record fields other than the primary
 *      value should also have their `rendererIsComplex` flag set to true to ensure they are
 *      re-run whenever the record (and not just the primary value) changes.
 * @return {Element} - the React element to render.
 */

/**
 * @callback Column~cellClassFn - function to generate grid cell CSS classes.
 * @param {*} value - cell data value (column + row).
 * @param {CellContext} context - additional data about the column, row and GridModel.
 * @return {(string|string[])} - CSS class(es) to use.
 */

/**
 * @callback Column~headerClassFn - function to generate header CSS classes.
 * @param {HeaderContext} context - contains data about the column and GridModel.
 * @return {(string|string[])} - CSS class(es) to use.
 */

/**
 * @typedef {Object} CellContext
 * @property {Record} record - row-level data Record.
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
 * @property {Record} record - row-level data Record.
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
 * @param {Record} params.record - row-level data Record.
 * @param {Store} params.store - Store containing the grid data.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @param {IsColumnFuncParams} params.agParams - the ag-grid column function params.
 * @return {boolean} - true if cell is editable
 */

/**
 * @callback Column~setValueFn - function to update the value of a Record field after inline editing
 * @param {Object} params
 * @param {*} params.value - the new value for the field.
 * @param {Record} params.record - row-level data Record.
 * @param {Store} params.store - Store containing the grid data.
 * @param {Column} params.column - column for the cell being edited.
 * @param {GridModel} params.gridModel - gridModel for the grid.
 * @param {ValueSetterParams} [params.agParams] - the ag-Grid value setter params.
 */

/**
 * @callback Column~getValueFn - function to get the value of a Record field
 * @param {Object} params
 * @param {Record} params.record - row-level data Record.
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
