/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {
    groupBy,
    isFinite,
    isFunction,
    isNil,
    map,
    max,
    min,
    reduce,
    sum,
    compact,
    sortBy,
    isEmpty
} from 'lodash';

/**
 * Calculates the column width required to display all values in a column.
 *
 * Unlike the native ag-Grid autosizing, this service will compute a size based on all
 * data in the grid, including off-screen rows and columns, and collapsed rows.
 *
 * In order to do this efficiently, this service uses heuristics and that generally assumes each
 * column consists of similarly formatted strings.  In particular, it cannot make the computation
 * when a react based elementRenderer has been specified for a column. In this case, no width will
 * be computed, and the column will be ignored by this service.
 *
 * @see Column.autosizeOptions for options to control this behaviour
 */
@HoistService
export class GridAutosizeService {

    _canvasContext;
    _headerEl;
    _cellEl;

    /**
     * Calculate and apply autosized column widths.
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {String[]} colIds - array of columns in model to compute sizing for.
     * @param {GridAutosizeOptions} options - options to use for this autosize.
     */
    @action
    autosizeColumns(gridModel, colIds, options) {
        // 1) Remove any columns with element renderers
        colIds = colIds.filter(id => {
            const col = gridModel.getColumn(id);
            return col && !col.elementRenderer;
        });
        if (isEmpty(colIds)) return;

        // 2) Ensure order of passed colIds matches the current GridModel.columnState.
        // This is to prevent inadvertently changing the column order when applying column state changes
        colIds = sortBy(colIds, id => gridModel.columnState.findIndex(col => col.colId === id));

        // 3) Shrink columns down to their required widths.
        const requiredWidths = this.calcRequiredWidths(gridModel, colIds, options);
        gridModel.applyColumnStateChanges(requiredWidths);
        console.debug('Column widths autosized via GridAutosizeService', requiredWidths);

        // 4) Grow columns to fill any remaining space, if enabled.
        const fillWidths = this.calcFillWidths(gridModel, colIds, options);
        gridModel.applyColumnStateChanges(fillWidths);
        console.debug('Column widths filled via GridAutosizeService', fillWidths);
    }

    /**
     * Calculates the required column widths for a GridModel. Returns an array of the
     * form [{colId, width}] suitable for consumption by GridModel.applyColumnStateChanges().
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {String[]} colIds - array of columns in model to compute sizing for.
     * @param {GridAutosizeOptions} options - options to use for this autosize.
     */
    calcRequiredWidths(gridModel, colIds, options) {
        const {store, agApi} = gridModel,
            ret = [];

        // Get filtered set of records
        let records = [];
        if (agApi?.isAnyFilterPresent()) {
            agApi.forEachNodeAfterFilter(node => {
                const record = store.getById(node.data?.id);
                if (record) records.push(record);
            });
        } else {
            records = [...store.records];
        }

        if (gridModel.showSummary && store.summaryRecord) {
            records.push(store.summaryRecord);
        }

        for (const colId of colIds) {
            const width = this.autosizeColumn(gridModel, records, colId, options);
            if (isFinite(width)) ret.push({colId, width});
        }

        return ret;
    }

    /**
     * Calculate the increased size of columns to fill any remaining space. Returns an array of the
     * form [{colId, width}] suitable for consumption by GridModel.applyColumnStateChanges().
     * Typically called via `GridModel.autosizeAsync()`.
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {String[]} colIds - array of columns in model to compute sizing for.
     * @param {GridAutosizeOptions} options - options to use for this autosize.
     */
    calcFillWidths(gridModel, colIds, options) {
        const {fillMode} = options;
        if (!fillMode || fillMode === 'none' || gridModel.getVisibleLeafColumns().some(it => it.flex)) return [];
        throwIf(!['all', 'left', 'right'].includes(fillMode), `Unsupported value "${fillMode}" for fillMode.`);

        // 1) Exclude pinned columns
        colIds = colIds.filter(id => !gridModel.getColumnPinned(id));
        if (isEmpty(colIds)) return [];

        // 1) Get available width of rendered grid
        const {agApi} = gridModel,
            available = agApi?.gridPanel?.eBodyHorizontalScrollViewport?.clientWidth;

        if (!agApi || !isFinite(available)) {
            console.warn('Grid not rendered - unable to fill columns.');
            return [];
        }

        // 2) Get remaining space to be filled
        const fillState = this.getFillState(gridModel, colIds),
            remaining = available - fillState.total;
        if (remaining <= 0) return [];

        // 3) Distribute remaining space according to fill mode
        switch (fillMode) {
            case 'all':
                return this.fillEvenly(fillState.columns, remaining);
            case 'left':
                return this.fillSequentially(fillState.columns, remaining);
            case 'right':
                return this.fillSequentially(fillState.columns.reverse(), remaining);
        }
    }

    //------------------
    // Implementation
    //------------------
    autosizeColumn(gridModel, records, colId, options) {
        const column = gridModel.findColumn(gridModel.columns, colId),
            {autosizeMinWidth, autosizeMaxWidth} = column;

        let result = max([
            this.calcHeaderMaxWidth(gridModel, column, options),
            this.calcDataMaxWidth(gridModel, records, column, options)
        ]);

        result = max([result, autosizeMinWidth]);
        result = min([result, autosizeMaxWidth]);
        return result;
    }

    calcHeaderMaxWidth(gridModel, column, options) {
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

    calcDataMaxWidth(gridModel, records, column, options) {
        try {
            if (column.elementRenderer) return null;

            const {store, sizingMode, treeMode} = gridModel;

            this.setCellElActive(true);
            this.setCellElSizingMode(sizingMode);

            if (treeMode && column.isTreeColumn && store.allRootCount !== store.allCount) {
                // For tree columns, we need to account for the indentation at the different depths.
                // Here we group the records by tree depth and determine the max width at each depth.
                const recordsByDepth = groupBy(records, record => record.ancestors.length),
                    levelMaxes = map(recordsByDepth, (records, depth) => {
                        return this.calcMaxWidth(gridModel, records, column, options, this.getIndentation(depth));
                    });

                return max(levelMaxes);
            } else {
                return this.calcMaxWidth(gridModel, records, column, options);
            }
        } catch (e) {
            console.warn(`Error calculating max data width for column "${column.colId}".`, e);
        } finally {
            this.setCellElActive(false);
        }
    }

    calcMaxWidth(gridModel, records, column, options, indentationPx = 0) {
        const {field, getValueFn, renderer} = column,
            {bufferPx, sampleCount} = options,
            useRenderer = isFunction(renderer);

        // 1) Get unique values
        const values = new Set();
        records.forEach(record => {
            if (!record) return;
            const rawValue = getValueFn({record, field, column, gridModel}),
                value = useRenderer ? renderer(rawValue, {record, column, gridModel}) : rawValue;
            values.add(value);
        });

        // 2) Use a canvas to estimate and sort by the pixel width of the string value.
        // Strip html tags but include parentheses / units etc. for renderers that may return html,
        const sortedValues = sortBy(Array.from(values), value => {
            const width = isNil(value) ? 0 : this.getStringWidth(stripTags(value.toString()));
            return width + indentationPx;
        });

        // 3) Extract the sample set of longest values for rendering and sizing
        const longestValues = sortedValues.slice(Math.max(sortedValues.length - sampleCount, 0));

        // 4) Render to a hidden cell to calculate the max displayed width
        return reduce(longestValues, (currMax, value) => {
            const width = this.getCellWidth(value, useRenderer) + indentationPx + bufferPx;
            return Math.max(currMax, width);
        }, 0);
    }

    //------------------
    // Autosize header cell
    //------------------
    getHeaderWidth(gridModel, column, includeHeaderSortIcon, bufferPx) {
        const {colId, headerName, agOptions} = column,
            headerHtml = isFunction(headerName) ? headerName({column, gridModel}) : headerName,
            showSort = column.sortable && (includeHeaderSortIcon || gridModel.sortBy.find(sorter => sorter.colId === colId)),
            showMenu = agOptions?.suppressMenu === false;

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
    getCellWidth(value, useRenderer) {
        const cellEl = this.getCellEl();
        if (useRenderer) {
            cellEl.innerHTML = value;
        } else if (cellEl.firstChild?.nodeType === 3) {
            // If we're not rendering html and the cell's first child is already a TextNode,
            // we can update it's data to avoid creating a new TextNode.
            cellEl.firstChild.data = value;
        } else {
            cellEl.innerText = value;
        }
        return Math.ceil(cellEl.clientWidth);
    }

    setCellElActive(active) {
        const cellEl = this.getCellEl();
        if (active) {
            cellEl.classList.add('xh-grid-autosize-cell--active');
        } else {
            cellEl.classList.remove('xh-grid-autosize-cell--active');
        }
    }

    setCellElSizingMode(sizingMode) {
        const cellEl = this.getCellEl();
        cellEl.classList.remove(
            'xh-grid-autosize-cell--large',
            'xh-grid-autosize-cell--standard',
            'xh-grid-autosize-cell--compact',
            'xh-grid-autosize-cell--tiny'
        );
        cellEl.classList.add(`xh-grid-autosize-cell--${sizingMode}`);
    }

    getCellEl() {
        if (!this._cellEl) {
            const cellEl = document.createElement('div');
            cellEl.classList.add('xh-grid-autosize-cell');
            document.body.appendChild(cellEl);
            this._cellEl = cellEl;
        }
        return this._cellEl;
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
            const canvasContext = canvasEl.getContext('2d');
            canvasContext.font = 'var(--xh-grid-font-size-px) var(--xh-grid-font-family)';
            this._canvasContext = canvasContext;
        }
        return this._canvasContext;
    }

    //------------------
    // Column width filling
    //------------------

    /**
     * Divide the remaining space evenly amongst columns, while respecting their maxWidths.
     */
    fillEvenly(columns, remaining) {
        const ret = {};

        while (remaining > 0) {
            const targetColumns = columns.filter(col => !isFinite(col.maxWidth) || col.width < col.maxWidth);
            if (isEmpty(targetColumns)) break;

            const targetAdd = Math.floor(remaining / targetColumns.length);
            if (targetAdd === 0) break;

            targetColumns.forEach(col => {
                const {colId, width, maxWidth} = col,
                    currWidth = ret[colId] ?? width,
                    extraWidth = isFinite(maxWidth) ? Math.min(maxWidth - currWidth, targetAdd) : targetAdd;

                if (extraWidth > 0) {
                    remaining -= extraWidth;
                    ret[colId] = currWidth + extraWidth;
                }
            });
        }

        return map(ret, (width, colId) => {
            return {width, colId};
        });
    }

    /**
     * Divide the remaining space across columns in order, while respecting their maxWidths.
     */
    fillSequentially(columns, remaining) {
        const ret = [];
        for (const col of columns) {
            const {colId, maxWidth, width} = col,
                extraWidth = isFinite(maxWidth) ? Math.min(maxWidth - width, remaining) : remaining;

            if (extraWidth > 0) {
                remaining -= extraWidth;
                ret.push({colId, width: width + extraWidth});
            }

            if (remaining <= 0) break;
        }
        return ret;
    }

    getFillState(gridModel, colIds) {
        const total = this.getTotalColumnWidth(gridModel),
            columns = compact(colIds.map(colId => this.getColumnFillState(gridModel, colId)));

        return {total, columns};
    }

    /**
     * Returns an array of column state representations,
     * suitable for use by the column fill algorithms.
     */
    getColumnFillState(gridModel, colId) {
        const column = gridModel.getColumn(colId),
            colState = gridModel.getStateForColumn(colId);

        if (!column || !colState || colState.hidden) return null;

        const {width} = colState,
            maxWidth = column.autosizeMaxWidth;

        return {colId, width, maxWidth};
    }

    /**
     * Returns the total combined width of visible columns.
     * Note that this intentionally excludes pinned columns.
     */
    getTotalColumnWidth(gridModel) {
        const widths = gridModel.columnState.filter(it => !it.hidden && !it.pinned).map(it => it.width);
        return sum(widths);
    }

}
