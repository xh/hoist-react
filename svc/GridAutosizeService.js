/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {stripTags} from '@xh/hoist/utils/js';
import {isFunction, isNil, isFinite, sortBy, groupBy, map, reduce, min, max} from 'lodash';

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
 * @see Column.autoSizeOptions for options to control this behaviour
 */
@HoistService
export class GridAutosizeService {

    _canvasContext;
    _cellEl;

    /**
     * Calculates the required column widths for a GridModel. Returns an array of the
     * form [{colId, width}] suitable for consumption by GridModel.applyColumnStateChanges().
     * Typically called via `GridModel.autoSizeColumns()`.
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {String[]} colIds - array of columns in model to compute sizing for.
     */
    autoSizeColumns(gridModel, colIds) {
        const ret = [],
            {summaryRecord, allRecords} = gridModel.store,
            records = summaryRecord ? [...allRecords, summaryRecord] : allRecords;

        for (const colId of colIds) {
            const width = this.autoSizeColumn(gridModel, records, colId);
            if (isFinite(width)) ret.push({colId, width});
        }
        return ret;
    }

    //------------------
    // Implementation
    //------------------
    autoSizeColumn(gridModel, records, colId) {
        try {
            const {store} = gridModel,
                column = gridModel.findColumn(gridModel.columns, colId);

            if (column.elementRenderer) {
                return null;
            }

            if (gridModel.treeMode && column.isTreeColumn && store.allRootCount !== store.allCount) {
                // For tree columns, we need to account for the indentation at the different depths.
                // Here we group the records by tree depth and determine the max width at each depth.
                const recordsByDepth = groupBy(records, record => record.ancestors.length),
                    levelMaxes = map(recordsByDepth, (records, depth) => {
                        return this.calcMaxWidth(gridModel, records, column, this.getIndentation(depth));
                    });

                return max(levelMaxes);
            } else {
                return this.calcMaxWidth(gridModel, records, column);
            }
        } catch (e) {
            console.warn(`Error calculating width for column "${colId}".`, e);
        } finally {
            this.setCellElActive(false);
        }
    }

    calcMaxWidth(gridModel, records, column, indentation = 0) {
        const {autoSizeOptions, field, getValueFn, renderer} = column,
            {sampleCount, buffer, minWidth, maxWidth} = autoSizeOptions,
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
            return width + indentation;
        });

        // 3) Extract the sample set of longest values for rendering and sizing
        const longestValues = sortedValues.slice(Math.max(sortedValues.length - sampleCount, 0));

        // 4) Render to a hidden cell to calculate the max displayed width
        let result = reduce(longestValues, (currMax, value) => {
            const width = this.getCellWidth(value, useRenderer) + indentation + buffer;
            return Math.max(currMax, width);
        }, 0);

        result = max([result, minWidth]);
        result = min([result, maxWidth]);
        return result;
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
    // Autosize cell for width calculation
    //------------------
    getCellWidth(value, useRenderer) {
        const cellEl = this.getCellEl();
        this.setCellElActive(true);
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
            indentation = parseInt(window.getComputedStyle(cellEl).getPropertyValue('top'));
        depth = parseInt(depth) + 1; // Add 1 to account for expand / collapse arrow.
        return indentation * depth;
    }

}