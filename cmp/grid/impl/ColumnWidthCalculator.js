/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {stripTags} from '@xh/hoist/utils/js';
import {forOwn, groupBy, isEmpty, isFunction, isNil, map, max, min, reduce, sortBy} from 'lodash';

/**
 * Calculates the column width required to display column.  Used by GridAutoSizeService.
 *
 * Uses Canvas, off-screen DOM, and heuristics to estimate the actual size requirement
 * for a set of records when rendered in a column.
 *
 * @private
 */
export class ColumnWidthCalculator {

    SAMPLE_COUNT = 10;

    _canvasContext;
    _headerEl;
    _cellEl;
    _rowEl;

    /**
     *
     * @param {GridModel} gridModel
     * @param {Record[]} records
     * @param {string} colId
     * @param {GridAutosizeOptions} options
     * @returns {*}
     */
    calcWidth(gridModel, records, colId, options) {
        const column = gridModel.findColumn(gridModel.columns, colId),
            {autosizeMinWidth, autosizeMaxWidth} = column;

        let result = max([
            this.calcHeaderWidth(gridModel, column, options),
            this.calcDataWidth(gridModel, records, column, options)
        ]);

        result = max([result, autosizeMinWidth]);
        result = min([result, autosizeMaxWidth]);
        return result;
    }

    calcHeaderWidth(gridModel, column, options) {
        const {autosizeIncludeHeader, autosizeIncludeHeaderIcons} = column,
            {bufferPx} = options;

        if (!autosizeIncludeHeader) return null;

        try {
            this.setHeaderElActive(true);
            this.setHeaderElSizingMode(gridModel.sizingMode);
            return this.getHeaderWidth(gridModel, column, autosizeIncludeHeaderIcons, bufferPx);
        } catch (e) {
            console.warn(`Error calculating max header width for column "${column.colId}".`, e);
        } finally {
            this.setHeaderElActive(false);
        }
    }

    calcDataWidth(gridModel, records, column, options) {
        try {
            if (column.elementRenderer) return null;

            const {store, treeMode} = gridModel;
            if (treeMode && column.isTreeColumn && store.allRootCount !== store.allCount) {
                // For tree columns, we need to account for the indentation at the different depths.
                // Here we group the records by tree depth and determine the max width at each depth.
                const recordsByDepth = groupBy(records, record => record.ancestors.length),
                    levelMaxes = map(recordsByDepth, (records, depth) => {
                        return this.calcLevelWidth(gridModel, records, column, options, this.getIndentation(depth));
                    });

                return max(levelMaxes);
            } else {
                return this.calcLevelWidth(gridModel, records, column, options);
            }
        } catch (e) {
            console.warn(`Error calculating max data width for column "${column.colId}".`, e);
        } finally {
            this.resetClassNames();
        }
    }

    calcLevelWidth(gridModel, records, column, options, indentationPx = 0) {
        const {field, getValueFn, renderer} = column,
            {sizingMode} = gridModel,
            {bufferPx} = options;

        // 1) Get unique values
        const values = new Set(),
            valueClassMap = {};

        records.forEach(record => {
            if (!record) return;
            const ctx = {record, field, column, gridModel, store: gridModel.store},
                rawValue = getValueFn(ctx),
                value = renderer ? renderer(rawValue, ctx) : rawValue,
                cellClass = this.getCellClass(gridModel, column, record, rawValue),
                rowClass = this.getRowClass(gridModel, record);

            values.add(value);

            // 1b) Track combinations of cell and row classes applied to this value.
            if (!valueClassMap[value]) {
                valueClassMap[value] = {
                    cellClasses: new Set(),
                    rowClasses: new Set()
                };
            }
            valueClassMap[value].cellClasses.add(cellClass);
            valueClassMap[value].rowClasses.add(rowClass);
        });

        // 2) Use a canvas to estimate and sort by the pixel width of the string value.
        // Strip html tags but include parentheses / units etc. for renderers that may return html.
        const sortedValues = sortBy(Array.from(values), value => {
            const width = isNil(value) ? 0 : this.getStringWidth(stripTags(value.toString()));
            return width + indentationPx;
        });

        // 3) Extract the sample set of longest values for rendering and sizing
        const longestValues = sortedValues.slice(Math.max(sortedValues.length - this.SAMPLE_COUNT, 0));

        // 4) Render to a hidden cell to calculate the max displayed width
        return reduce(longestValues, (currMax, value) => {
            const {cellClasses, rowClasses} = valueClassMap[value];

            // 4b) Loop through all combinations of cell and row classes applied to this value,
            // and return the largest.
            let ret = 0;
            rowClasses.forEach(rowClass => {
                cellClasses.forEach(cellClass => {
                    this.setClassNames(sizingMode, rowClass, cellClass);
                    const width = this.getCellWidth(value, renderer) + indentationPx + bufferPx;
                    ret = Math.max(ret, width);
                });
            });

            return Math.max(currMax, ret);
        }, 0);
    }

    //------------------
    // Autosize header cell
    //------------------
    getHeaderWidth(gridModel, column, includeHeaderIcons, bufferPx) {
        const {colId, headerName, agOptions, sortable, filterable} = column,
            headerHtml = isFunction(headerName) ? headerName({column, gridModel}) : headerName,
            showSort = sortable && (includeHeaderIcons || gridModel.sortBy.find(sorter => sorter.colId === colId)),
            showMenu = (agOptions?.suppressMenu === false || filterable) && includeHeaderIcons;

        // Render to a hidden header cell to calculate the max displayed width
        const headerEl = this.getHeaderEl();
        this.setHeaderElSortAndMenu(showSort, showMenu);
        headerEl.firstChild.innerHTML = headerHtml;
        return Math.ceil(headerEl.clientWidth) + bufferPx;
    }

    setHeaderElActive(active) {
        const headerEl = this.getHeaderEl();
        if (active) {
            headerEl.classList.add('xh-grid-autosize-header--active');
        } else {
            headerEl.classList.remove('xh-grid-autosize-header--active');
        }
    }

    setHeaderElSizingMode(sizingMode) {
        const headerEl = this.getHeaderEl();
        headerEl.classList.remove(
            'xh-grid-autosize-header--large',
            'xh-grid-autosize-header--standard',
            'xh-grid-autosize-header--compact',
            'xh-grid-autosize-header--tiny'
        );
        headerEl.classList.add(`xh-grid-autosize-header--${sizingMode}`);
    }

    setHeaderElSortAndMenu(sort, menu) {
        const headerEl = this.getHeaderEl();
        headerEl.classList.remove(
            'xh-grid-autosize-header--sort',
            'xh-grid-autosize-header--menu'
        );
        if (sort) headerEl.classList.add('xh-grid-autosize-header--sort');
        if (menu) headerEl.classList.add('xh-grid-autosize-header--menu');
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
        this.getRowEl().classList.add(rowClass);
        this.getCellEl().classList.add(
            'xh-grid-autosize-cell--active',
            `xh-grid-autosize-cell--${sizingMode}`,
            cellClass
        );
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

        return !isEmpty(ret) ? ret.join(' ') : null;
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

        return !isEmpty(ret) ? ret.join(' ') : null;
    }

    //-----------------
    // Indentation
    //-----------------
    getIndentation(depth) {
        const cellEl = this.getCellEl(),
            indentation = parseInt(window.getComputedStyle(cellEl).getPropertyValue('left'));
        depth = parseInt(depth) + 1; // Add 1 to account for expand / collapse arrow.
        return indentation * depth;
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
