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
     * @param {Column~rendererFn} [c.renderer] - function to produce a formatted string for each cell.
     *      Supports HTML as output. Passed both field value and entire row data object.
     * @param {function} [c.elementRenderer] - elementFactory function to return a React component
     *      for rendering within each cell. For ag-Grid implementations, an ICellRendererParams
     *      object is passed to the rendered component as props.
     *      @see ICellRendererParams
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
     * @param {(boolean|Column~tooltipFn)} [c.tooltip] - 'true' displays the raw value, or
     *      tool tip function, which is based on AG Grid tooltip callback.
     * @param {boolean} [c.excludeFromExport] - true to drop this column from a file export.
     * @param {Object} [c.agOptions] - "escape hatch" object to pass directly to Ag-Grid for
     *      desktop implementations. Note these options may be used / overwritten by the framework
     *      itself, and are not all guaranteed to be compatible with its usages of Ag-Grid.
     *      @see {@link https://www.ag-grid.com/javascript-grid-column-properties/|AG-Grid docs}
     */
    constructor({
        field,
        colId,
        isTreeColumn,
        headerName,
        hide,
        align,
        width,
        minWidth,
        maxWidth,
        flex,
        absSort,
        resizable,
        movable,
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
        excludeFromExport,
        tooltip,
        agOptions
    }) {
        this.field = field;
        this.colId = withDefault(colId, field);
        throwIf(!this.colId, 'Must specify colId or field for a Column.');

        this.headerName = withDefault(headerName, startCase(this.colId));
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
            hide: this.hide,
            absSort: this.absSort,
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            suppressResize: !this.resizable,
            suppressMovable: !this.movable,
            headerComponentParams: {gridModel, column: this}
        };

        if (this.isTreeColumn) {
            ret.showRowGroup = true;
            ret.cellRenderer = 'agGroupCellRenderer';
            ret.cellRendererParams = {
                suppressCount: true,
                suppressDoubleClickExpand: true,
                padding: 10,
                innerRenderer: (v) => v.data[this.field]
            };
        }

        if (this.tooltip) {
            ret.tooltip = isFunction(this.tooltip) ?
                ({value, data}) => this.tooltip(value, data, {colId: this.colId}) :
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
            ret.cellRenderer = (params) => {
                const metaData = {colId: params.column.colId};
                return renderer(params.value, params.data, metaData);
            };
        } else if (elementRenderer) {
            ret.cellRendererFramework = class extends Component {
                render() {return elementRenderer(this.props)}
                refresh() {return false}
            };
        }

        // Finally, apply explicit app requests.  The customer is always right....
        return {...ret, ...this.agOptions};
    }
}

/**
 * @callback Column~rendererFn - normalized renderer function for a grid column cell.
 * @param {*} value - cell data value (column + row).
 * @param {Object} data - row data object (entire row).
 * @param {Object} metadata - additional data available to the renderer,
 *      currently contains the Column's string colId.
 * @return {string} - the formatted value for display.
 */

/**
 * @callback Column~tooltipFn - normalized renderer function to produce a grid column tooltip.
 * @param {*} value - cell data value (column + row).
 * @param {Object} data - row data object (entire row).
 * @param {Object} metadata - additional data available to the renderer,
 *      currently contains the Column's string colId.
 * @return {string} - the formatted value for display.
 */
