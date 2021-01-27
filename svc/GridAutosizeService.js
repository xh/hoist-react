/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {isFinite, map, sum, compact, sortBy, isEmpty} from 'lodash';
import {runInAction} from '@xh/hoist/mobx';
import {ColumnWidthCalculator} from '../cmp/grid/impl/ColumnWidthCalculator';

/**
 * Sets appropriate column widths for a grid based on its contents.  Generally
 * seeks to make columns at least as wide as all of their contents, including headers.
 *
 * Unlike the native ag-Grid autosizing, this service will compute a size based on all
 * data in the grid, including off-screen rows and columns, and collapsed rows.
 *
 * In order to do this efficiently, this service uses heuristics and generally assumes each
 * column consists of similarly formatted strings.  In particular, it cannot make the computation
 * when a react based elementRenderer has been specified for a column. In this case, no width will
 * be computed, and the column will be ignored by this service.
 *
 * @see Column.autosizeOptions for options to control this behaviour
 */
export class GridAutosizeService extends HoistService {

    _columnWidthCalculator = new ColumnWidthCalculator();

    /**
     * Calculate and apply autosized column widths.
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {string[]} colIds - array of columns in model to compute sizing for.
     * @param {GridAutosizeOptions} options - options to use for this autosize.
     */
    async autosizeAsync(gridModel, colIds, options) {
        // 1) Remove any columns with element renderers
        colIds = colIds.filter(id => {
            const col = gridModel.getColumn(id);
            return col && !col.elementRenderer;
        });
        if (isEmpty(colIds)) return;

        // 2) Ensure order of passed colIds matches the current GridModel.columnState.
        // This is to prevent changing the column order when applying column state changes
        colIds = sortBy(colIds, id => gridModel.columnState.findIndex(col => col.colId === id));
        runInAction(() => {
            // 3) Shrink columns down to their required widths.
            const requiredWidths = this.calcRequiredWidths(gridModel, colIds, options);
            gridModel.applyColumnStateChanges(requiredWidths);
            console.debug('Column widths autosized via GridAutosizeService', requiredWidths);

            // 4) Grow columns to fill any remaining space, if enabled.
            const {fillMode} = options;
            if (fillMode && fillMode !== 'none') {
                const fillWidths = this.calcFillWidths(gridModel, colIds, fillMode);
                gridModel.applyColumnStateChanges(fillWidths);
                console.debug('Column widths filled via GridAutosizeService', fillWidths);
            }
        });
    }


    //------------------
    // Implementation
    //------------------
    /**
     * Calculates the required column widths for a GridModel. Returns an array of the
     * form [{colId, width}] suitable for consumption by GridModel.applyColumnStateChanges().
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {string[]} colIds - array of columns in model to compute sizing for.
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
            const width = this._columnWidthCalculator.calcWidth(gridModel, records, colId, options);
            if (isFinite(width)) ret.push({colId, width});
        }

        return ret;
    }


    /**
     * Calculate the increased size of columns to fill any remaining space. Returns an array of the
     * form [{colId, width}] suitable for consumption by GridModel.applyColumnStateChanges().
     *
     * @param {GridModel} gridModel - GridModel to autosize.
     * @param {string[]} colIds - array of columns in model to compute sizing for.
     * @param {string} fillMode
     */
    calcFillWidths(gridModel, colIds, fillMode) {
        if (gridModel.getVisibleLeafColumns().some(it => it.flex)) {
            return [];
        }

        // 1) Exclude pinned columns
        colIds = colIds.filter(id => !gridModel.getColumnPinned(id));
        if (isEmpty(colIds)) return [];

        // 1) Get available width of rendered grid
        const {agApi} = gridModel,
            available = agApi?.gridPanel?.eBodyViewport?.clientWidth;

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

    // Divide the remaining space evenly amongst columns, while respecting their maxWidths.
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

    // Divide the remaining space across columns in order, while respecting their maxWidths.
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
        return {
            total: this.getTotalColumnWidth(gridModel),
            columns: compact(colIds.map(colId => this.getColumnFillState(gridModel, colId)))
        };
    }

    // Returns an array of column state representations,
    // suitable for use by the column fill algorithms.
    getColumnFillState(gridModel, colId) {
        const column = gridModel.getColumn(colId),
            colState = gridModel.getStateForColumn(colId);

        if (!column || !colState || colState.hidden) return null;

        return {
            colId,
            width: colState.width,
            maxWidth: column.autosizeMaxWidth
        };
    }

    // Returns the total combined width of visible columns.
    getTotalColumnWidth(gridModel) {
        const widths = gridModel.columnState.filter(it => !it.hidden).map(it => it.width);
        return sum(widths);
    }
}
