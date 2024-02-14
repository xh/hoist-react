/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {GridAutosizeOptions} from '@xh/hoist/cmp/grid/GridAutosizeOptions';
import {XH} from '@xh/hoist/core';
import {CompoundFilter, FieldFilter, Filter, StoreRecord} from '@xh/hoist/data';
import {forEachAsync} from '@xh/hoist/utils/async';
import {logWarn, stripTags} from '@xh/hoist/utils/js';
import {
    forOwn,
    groupBy,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isString,
    map,
    max,
    min,
    sortBy,
    takeRight
} from 'lodash';
import {isValidElement} from 'react';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {Column} from '../columns';
import {GridModel} from '../GridModel';

/**
 * Calculates the column width required to display column.  Used by GridAutoSizeService.
 *
 * Uses Canvas, off-screen DOM, and heuristics to estimate the actual size requirement
 * for a set of records when rendered in a column.
 *
 * @internal
 */
export class ColumnWidthCalculator {
    /** Max number value to calculate size per column */
    SIZE_CALC_SAMPLES = 10;

    private _canvasContext;
    private _headerEl;
    private _cellEl;
    private _rowEl;

    async calcWidthAsync(
        gridModel: GridModel,
        records: StoreRecord[],
        colId: string,
        options: GridAutosizeOptions
    ) {
        const column = gridModel.findColumn(gridModel.columns, colId),
            {autosizeMinWidth, autosizeMaxWidth} = column;

        let result = max([
            this.calcHeaderWidth(gridModel, column, options),
            await this.calcDataWidthAsync(gridModel, records, column, options)
        ]);

        result = max([result, autosizeMinWidth]);
        result = min([result, autosizeMaxWidth]);
        return result;
    }

    calcHeaderWidth(gridModel, column, options) {
        const {autosizeIncludeHeader, autosizeIncludeHeaderIcons} = column,
            bufferPx = column.autosizeBufferPx ?? options.bufferPx;

        if (!autosizeIncludeHeader) return null;

        try {
            return this.getHeaderWidth(gridModel, column, autosizeIncludeHeaderIcons, bufferPx);
        } catch (e) {
            logWarn([`Error calculating max header width for colId '${column.colId}'.`, e], this);
        } finally {
            this.resetHeaderClassNames();
        }
    }

    async calcDataWidthAsync(gridModel, records, column, options) {
        if (isEmpty(records)) return null;

        try {
            const {store, treeMode} = gridModel;
            if (treeMode && column.isTreeColumn && store.allRootCount !== store.allCount) {
                // For tree columns, we need to account for the indentation at the different depths.
                // Here we group the records by tree depth and determine the max width at each depth.
                const recordsByDepth = groupBy(records, record => record.ancestors.length),
                    levelTasks = map(recordsByDepth, (records, depth) => {
                        return this.calcLevelWidthAsync(
                            gridModel,
                            records,
                            column,
                            options,
                            this.getIndentation(depth)
                        );
                    }),
                    levelMaxes = await Promise.all(levelTasks);
                return max(levelMaxes);
            } else {
                return await this.calcLevelWidthAsync(gridModel, records, column, options);
            }
        } catch (e) {
            logWarn([`Error calculating max data width for colId '${column.colId}'.`, e], this);
        } finally {
            this.resetClassNames();
        }
    }

    async calcLevelWidthAsync(gridModel, records, column, options, indentationPx = 0) {
        const {field, getValueFn, renderer, rendererIsComplex, cellClassFn, cellClassRules} =
                column,
            {store, sizingMode, rowClassFn, rowClassRules} = gridModel,
            bufferPx = column.autosizeBufferPx ?? options.bufferPx;

        // 1) Get map of rendered values to data about it
        const estimatesByValue = new Map(),
            renderMemo = renderer && !rendererIsComplex ? new Map() : null;

        await forEachAsync(records, record => {
            if (!record) return;

            const ctx = {record, field, column, gridModel, store},
                rawValue = getValueFn(ctx);

            // 1a) Get rendered markup value from raw.  Use memoization if appropriate
            let value = rawValue;
            if (renderer) {
                if (renderMemo?.has(rawValue)) {
                    value = renderMemo.get(rawValue);
                } else {
                    value = renderer(rawValue, ctx);
                    if (isValidElement(value)) value = renderToStaticMarkup(value);
                    renderMemo?.set(rawValue, value);
                }
            }

            // 1b) Use a canvas to estimate pixel width of new markup.
            // Strip html tags but include parentheses / units etc. for renderers that may return elements.
            const est = estimatesByValue.get(value);
            if (!est) {
                estimatesByValue.set(value, {
                    value,
                    width: isNil(value)
                        ? 0
                        : this.getStringWidth(stripTags(value.toString())) + indentationPx,
                    records: [record]
                });
            } else {
                est.records.push(record);
            }
        });

        // 2) Extract the sample set of widest estimate values for rendering and sizing
        let sample = Array.from(estimatesByValue.values());
        sample = takeRight(sortBy(sample, 'width'), this.SIZE_CALC_SAMPLES);

        // 3) Get widest values, after actually rendering all css combinations for all records
        let ret = 0;
        await forEachAsync(sample, ({value, records}) => {
            // Get unique combinations of row and cell classes applied
            const classNames = new Set<string>();
            if (rowClassFn || cellClassFn || !isEmpty(rowClassRules) || !isEmpty(cellClassRules)) {
                records.forEach(record => {
                    const rawValue = getValueFn({record, field, column, gridModel, store}),
                        rowClass = this.getRowClass(gridModel, record),
                        cellClass = this.getCellClass(gridModel, column, record, rawValue);
                    classNames.add(rowClass + '|' + cellClass);
                });
            } else {
                classNames.add('|');
            }

            // 5) Render to a hidden cell to calculate the max displayed width. Loop through all
            // combinations of cell and row classes applied to this value, and return the largest.
            classNames.forEach(it => {
                const [rowClass, cellClass] = it.split('|');
                this.setClassNames(sizingMode, rowClass, cellClass);
                const width = this.getCellWidth(value, renderer) + indentationPx + bufferPx;
                ret = Math.max(ret, width);
            });
        });
        return ret;
    }

    //------------------
    // Autosize header cell
    //------------------
    getHeaderWidth(gridModel, column, includeHeaderIcons, bufferPx) {
        const {colId, agOptions, sortable, filterable} = column,
            {sizingMode, filterModel} = gridModel,
            headerHtml = this.getHeaderHtml(gridModel, column),
            headerClass = this.getHeaderClass(gridModel, column),
            showSort =
                sortable &&
                (includeHeaderIcons || gridModel.sortBy.find(sorter => sorter.colId === colId));

        let showMenu =
            (agOptions?.suppressMenu === false || (filterable && filterModel)) &&
            includeHeaderIcons;

        // If only showing menu on hover, only need to allot room if the column is filtered
        if (showMenu && gridModel.headerMenuDisplay === 'hover') {
            showMenu = this.isColumnFiltered(filterModel.filter, column);
        }

        // Render to a hidden header cell to calculate the max displayed width
        const headerEl = this.getHeaderEl();
        this.setHeaderClassNames(sizingMode, showSort, showMenu, headerClass);
        headerEl.firstChild.innerHTML = headerHtml;
        return Math.ceil(headerEl.clientWidth) + bufferPx;
    }

    isColumnFiltered(filter: Filter, column: Column): boolean {
        if (filter instanceof FieldFilter) {
            return filter.field === column.field;
        } else if (filter instanceof CompoundFilter) {
            for (let f of filter.filters) {
                if (this.isColumnFiltered(f, column)) return true;
            }
        }
        return false;
    }

    getHeaderHtml(gridModel, column) {
        const {headerName} = column,
            headerValue = isFunction(headerName)
                ? headerName({column, gridModel, agParams: null})
                : headerName;

        if (isNil(headerValue)) return '';
        if (isString(headerValue)) return headerValue;
        if (isValidElement(headerValue)) return renderToStaticMarkup(headerValue);
        throw XH.exception(
            'Unable to get column header html because value is not a string or valid react element'
        );
    }

    resetHeaderClassNames() {
        const headerEl = this.getHeaderEl();
        headerEl.classList.remove(...headerEl.classList);
        headerEl.classList.add('xh-grid-autosize-header');
    }

    setHeaderClassNames(sizingMode, showSort, showMenu, headerClass) {
        this.resetHeaderClassNames();
        this.getHeaderEl().classList.add(
            'xh-grid-autosize-header--active',
            `xh-grid-autosize-header--${sizingMode}`
        );
        if (showSort) this.getHeaderEl().classList.add('xh-grid-autosize-header--sort');
        if (showMenu) this.getHeaderEl().classList.add('xh-grid-autosize-header--menu');
        if (!isEmpty(headerClass)) this.getHeaderEl().classList.add(...headerClass.split(' '));
    }

    getHeaderEl() {
        if (!this._headerEl) {
            const headerEl = document.createElement('div');
            headerEl.classList.add('xh-grid-autosize-header');
            headerEl.appendChild(document.createElement('span'));

            const sortIcon = document.createElement('div');
            sortIcon.classList.add('xh-grid-header-sort-icon');
            headerEl.appendChild(sortIcon);

            const menuIcon = document.createElement('div');
            menuIcon.classList.add('xh-grid-header-menu-icon');
            headerEl.appendChild(menuIcon);

            document.body.appendChild(headerEl);
            this._headerEl = headerEl;
        }
        return this._headerEl;
    }

    getHeaderClass(gridModel, column) {
        let {headerClass} = column;
        if (isNil(headerClass)) return '';

        if (isFunction(headerClass)) {
            headerClass = headerClass({column, gridModel});
        }

        const ret = [];
        if (isString(headerClass)) {
            ret.push(headerClass);
        } else if (isArray(headerClass)) {
            ret.push(...headerClass);
        }

        return ret.join(' ');
    }

    //------------------
    // Autosize cell
    //------------------
    getCellWidth(value, renderer) {
        const cellEl = this.getCellEl();
        if (renderer) {
            cellEl.innerHTML = value;
        } else if (cellEl.childNodes.length === 1 && cellEl.firstChild?.nodeType === 3) {
            // If we're not rendering html and the cell's first and only child is already a TextNode,
            // we can update it's data to avoid creating a new TextNode.
            cellEl.firstChild.data = value;
        } else {
            cellEl.innerText = value;
        }
        return Math.ceil(cellEl.clientWidth);
    }

    resetClassNames() {
        const rowEl = this.getRowEl(),
            cellEl = this.getCellEl();

        rowEl.classList.remove(...rowEl.classList);
        rowEl.classList.add('xh-grid-autosize-row');
        cellEl.classList.remove(...cellEl.classList);
        cellEl.classList.add('xh-grid-autosize-cell');
    }

    setClassNames(sizingMode, rowClass, cellClass) {
        this.resetClassNames();
        this.getCellEl().classList.add(
            'xh-grid-autosize-cell--active',
            `xh-grid-autosize-cell--${sizingMode}`
        );
        if (!isEmpty(rowClass)) this.getRowEl().classList.add(...rowClass.split(' '));
        if (!isEmpty(cellClass)) this.getCellEl().classList.add(...cellClass.split(' '));
    }

    getCellEl() {
        if (!this._cellEl) {
            const rowEl = this.getRowEl(),
                cellEl = document.createElement('div');
            cellEl.classList.add('xh-grid-autosize-cell');
            rowEl.appendChild(cellEl);
            this._cellEl = cellEl;
        }
        return this._cellEl;
    }

    getCellClass(gridModel, column, record, value) {
        const {cellClassFn, cellClassRules} = column,
            ret = [];

        if (cellClassFn) {
            ret.push(cellClassFn({record, column, gridModel}));
        }

        if (cellClassRules) {
            forOwn(cellClassRules, (fn, className) => {
                if (fn({value, data: record})) {
                    ret.push(className);
                }
            });
        }

        return ret.join(' ');
    }

    //------------------
    // Autosize row
    //------------------
    getRowEl() {
        if (!this._rowEl) {
            const rowEl = document.createElement('div');
            rowEl.classList.add('xh-grid-autosize-row');
            document.body.appendChild(rowEl);
            this._rowEl = rowEl;
        }
        return this._rowEl;
    }

    getRowClass(gridModel, record) {
        const {rowClassFn, rowClassRules} = gridModel,
            ret = [];

        if (rowClassFn) {
            ret.push(rowClassFn(record));
        }

        if (rowClassRules) {
            forOwn(rowClassRules, (fn, className) => {
                if (fn({data: record})) {
                    ret.push(className);
                }
            });
        }

        return ret.join(' ');
    }

    //-----------------
    // Indentation
    //-----------------
    getIndentation(depth) {
        const cellEl = this.getCellEl(),
            indentation = parseFloat(window.getComputedStyle(cellEl).getPropertyValue('left'));
        depth = parseInt(depth) + 1; // Add 1 to account for expand / collapse arrow.
        return Math.ceil(indentation * depth);
    }

    //------------------
    // Canvas-based width estimation
    //------------------
    getStringWidth(string) {
        const canvasContext = this.getCanvasContext();
        return canvasContext.measureText(string).width;
    }

    getCanvasContext() {
        if (!this._canvasContext) {
            // Create hidden canvas
            const canvasEl = document.createElement('canvas');
            canvasEl.classList.add('xh-grid-autosize-canvas');
            document.body.appendChild(canvasEl);

            // Create context which uses grid fonts
            const canvasContext = canvasEl.getContext('2d'),
                cellEl = this.getCellEl(),
                fontSize = window.getComputedStyle(cellEl).getPropertyValue('font-size'),
                fontFamily = window.getComputedStyle(cellEl).getPropertyValue('font-family');

            canvasContext.font = `${fontSize} ${fontFamily}`;
            this._canvasContext = canvasContext;
        }
        return this._canvasContext;
    }
}
