/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {castArray, startCase, isFunction, clone} from 'lodash';
import {ExportFormat} from './ExportFormat';
import {withDefault, withDefaultTrue, withDefaultFalse, throwIf, warnIf} from '@xh/hoist/utils/js';

/**
 * Cross-platform definition and API for a standardized Grid column.
 * Typically provided to GridModels as plain configuration objects.
 * @alias HoistColumn
 */
export class Column {

    static DEFAULT_WIDTH = 60;
    static FLEX_COL_MIN_WIDTH = 30;

    /**
     * @param {Object} c - Column configuration.
     * @param {string} [c.field] - name of data store field to display within the column.
     * @param {string} [c.colId] - unique identifier for the Column within its grid.
     *      Defaults to field name - one of these two properties must be specified.
     * @param {string} [c.headerName] - display text for grid header.
     * @param {(string|string[])} [c.headerClass] - additional css classes to add to the column header.
     * @param {(string|string[])} [c.cellClass] - additional css classes to add to each cell in the column.
     * @param {boolean} [c.isTreeColumn] - true if this column should show the tree affordances for a
     *      Tree Grid. See GridModel.treeMode.
     * @param {boolean} [c.hide] - true to suppress default display of the column.
     * @param {string} [c.align] - horizontal alignment of cell contents.
     * @param {number} [c.width] - default width in pixels.
     * @param {number} [c.minWidth] - minimum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing below this value. (Note this is *not* a substitute for width.)
     * @param {number} [c.maxWidth] - maximum width in pixels - grid will block user-driven as well
     *      as auto-flex resizing above this value.
     * @param {boolean} [c.flex] - true to auto-adjust column width based on space available
     *      within the overall grid. Flex columns are not user-resizable as they will dynamically
     *      adjust whenever the grid changes size to absorb available horizontal space.
     * @param {boolean} [c.absSort] - true to enable absolute value sorting for this column,
     *      with column header clicks progressing from ASC > DESC > DESC (abs value).
     * @param {boolean} [c.resizable] - false to prevent user from drag-and-drop resizing.
     * @param {boolean} [c.movable] - false to prevent user from drag-and-drop re-ordering.
     * @param {boolean} [c.sortable] - false to prevent user from sorting on this column.
     * @param {Column~rendererFn} [c.renderer] - function to produce a formatted string for each cell.
     * @param {Column~elementRendererFn} [c.elementRenderer] - function which returns a React component.
     * @param {string} [c.chooserName] - name to display within the column chooser component.
     *      Defaults to headerName, but useful when a longer / un-abbreviated string is available.
     * @param {string} [c.chooserGroup] - group name to display within the column chooser component.
     *      Chooser will automatically group its "available columns" grid if any cols provide.
     * @param {string} [c.chooserDescription] - additional descriptive text to display within the
     *      column chooser. Appears when the column is selected within the chooser UI.
     * @param {boolean} [c.excludeFromChooser] - true to hide the column from the column chooser
     *      completely. Useful for hiding structural columns the user is not expected to adjust.
     * @param {boolean} [c.hideable] - false to always show column. Will appear in column chooser
     *       but always locked in the displayed collection of columns.
     * @param {string} [c.exportName] - display name to use as a header within a file export.
     *      Defaults to headerName.
     * @param {(string|function)} [c.exportValue] - alternate field name to reference or function
     *      to call when producing a value for a file export.
     *      @see ExportManager
     * @param {ExportFormat} [c.exportFormat] - structured format string for Excel-based exports.
     *      @see ExportFormat
     * @param {number} [c.exportWidth] - width in characters for Excel-based exports. Typically used
     *      with ExportFormat.LONG_TEXT to enable text wrapping.
     * @param {(boolean|Column~tooltipFn)} [c.tooltip] - 'true' displays the raw value, or
     *      tool tip function, which is based on AG Grid tooltip callback.
     * @param {boolean} [c.excludeFromExport] - true to drop this column from a file export.
     * @param {Object} [c.agOptions] - "escape hatch" object to pass directly to Ag-Grid for
     *      desktop implementations. Note these options may be used / overwritten by the framework
     *      itself, and are not all guaranteed to be compatible with its usages of Ag-Grid.
     *      @see {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     * @param {...*} [rest] - additional properties to store on the column
     */
    constructor({
        field,
        colId,
        isTreeColumn,
        headerName,
        headerClass,
        cellClass,
        hide,
        align,
        width,
        minWidth,
        maxWidth,
        flex,
        absSort,
        resizable,
        movable,
        sortable,
        renderer,
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
        tooltip,
        agOptions,
        ...rest
    }) {
        Object.assign(this, rest);

        this.field = field;
        this.colId = withDefault(colId, field);
        throwIf(!this.colId, 'Must specify colId or field for a Column.');

        this.headerName = withDefault(headerName, startCase(this.colId));
        this.headerClass = castArray(headerClass);
        this.cellClass = castArray(cellClass);
        this.hide = withDefaultFalse(hide);
        this.align = align;
        this.isTreeColumn = withDefaultFalse(isTreeColumn);

        warnIf(
            flex && width,
            `Column ${this.colId} should not be specified with both flex = true && width.  Width will be ignored.`,
        );
        this.flex = withDefaultFalse(flex);
        this.width = this.flex ? null : width || Column.DEFAULT_WIDTH;

        // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
        this.minWidth = withDefault(minWidth, this.flex ? Column.FLEX_COL_MIN_WIDTH : null);
        this.maxWidth = maxWidth;

        this.absSort = withDefaultFalse(absSort);

        this.resizable = withDefaultTrue(resizable);
        this.movable = withDefaultTrue(movable);
        this.sortable = withDefaultTrue(sortable);

        this.renderer = renderer;
        this.elementRenderer = elementRenderer;

        this.chooserName = chooserName || this.headerName || this.colId;
        this.chooserGroup = chooserGroup;
        this.chooserDescription = chooserDescription;
        this.excludeFromChooser = withDefault(excludeFromChooser, this.isTreeColumn);
        this.hideable = withDefaultTrue(hideable);

        this.exportName = exportName || this.headerName || this.colId;
        this.exportValue = exportValue;
        this.exportFormat = withDefault(exportFormat, ExportFormat.DEFAULT);
        this.exportWidth = exportWidth || null;
        this.excludeFromExport = withDefault(excludeFromExport, !field);

        this.tooltip = tooltip;
        this.agOptions = agOptions ? clone(agOptions) : {};
    }

    /**
     * Produce a Column definition appropriate for AG Grid.
     */
    getAgSpec(gridModel) {
        const ret = {
            field: this.field,
            colId: this.colId,
            headerName: this.headerName,
            headerClass: this.headerClass,
            cellClass: this.cellClass,
            hide: this.hide,
            absSort: this.absSort,
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            suppressResize: !this.resizable,
            suppressMovable: !this.movable,
            suppressSorting: !this.sortable,
            headerComponentParams: {gridModel, column: this}
        };

        if (this.isTreeColumn) {
            ret.showRowGroup = true;
            ret.cellRenderer = 'agGroupCellRenderer';
            ret.cellRendererParams = {
                suppressCount: true,
                suppressDoubleClickExpand: true,
                innerRenderer: (v) => v.data[this.field]
            };
        }

        if (this.tooltip) {
            ret.tooltip = isFunction(this.tooltip) ?
                (agParams) => this.tooltip(agParams.value, {record: agParams.data, column: this, agParams}) :
                ({value}) => value;
        }

        const {align} = this;
        if (align === 'center' || align === 'right') {
            ret.headerClass = castArray(ret.headerClass) || [];
            ret.cellClass = castArray(ret.cellClass) || [];
            ret.headerClass.push('xh-column-header-align-'+align);
            ret.cellClass.push('xh-align-'+align);
        }

        if (this.flex) {
            ret.suppressResize = true;
            ret.width = Number.MAX_SAFE_INTEGER;
        } else {
            ret.suppressSizeToFit = true;
            ret.width = this.width;
        }

        const {renderer, elementRenderer} = this;
        if (renderer) {
            ret.cellRenderer = (agParams) => {
                return renderer(agParams.value, {record: agParams.data, column: this, agParams});
            };
        } else if (elementRenderer) {
            // eslint-disable-next-line consistent-this
            const column = this;
            ret.cellRendererFramework = class extends Component {
                render() {
                    const agParams = this.props,
                        {value, data: record} = agParams;

                    return elementRenderer(value, {record, agParams, column});
                }
                refresh() {return false}
            };
        }

        // Finally, apply explicit app requests.  The customer is always right....
        return {...ret, ...this.agOptions};
    }
}

/**
 * @callback Column~rendererFn - normalized renderer function for a grid cell.
 * @param {*} value - cell data value (column + row).
 * @param {CellRendererMetadata} metadata - additional data about the column and row.
 * @return {string} - the formatted value for display.
 */

/**
 * @callback Column~elementRendererFn - renderer function for a grid cell which returns a React component
 * @param {*} value - cell data value (column + row).
 * @param {CellRendererMetadata} metadata - additional data about the column and row.
 * @return {Element} - the React element to render.
 */

/**
 * @typedef {Object} CellRendererMetadata
 * @property {Record} record - row-level data Record.
 * @property {Column} column - column for the cell being rendered.
 * @property {ICellRendererParams} [agParams] - the ag-grid cell renderer params.
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
 * @property {TooltipParams} [agParams] - the ag-grid tooltip params.
 */
