/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {isFinite, map, sum, compact, sortBy, isEmpty} from 'lodash';
import {runInAction} from '@xh/hoist/mobx';
import {GridModel, GridAutosizeOptions} from '@xh/hoist/cmp/grid';
import {ColumnWidthCalculator} from '../cmp/grid/impl/ColumnWidthCalculator';
import {StoreRecord} from '@xh/hoist/data';

/**
 * Sets appropriate column widths for a grid based on its contents. Generally seeks to make columns
 * at least as wide as all of their contents, including headers.
 *
 * Unlike the native ag-Grid autosizing, this service will compute a size based on all data in the
 * grid, including off-screen rows and columns and (if requested) collapsed rows.
 *
 * In order to do this efficiently, this service uses heuristics and generally assumes each
 * column consists of similarly formatted strings.
 *
 * @see GridAutosizeOptions
 */
export class GridAutosizeService extends HoistService {
    override xhImpl = true;

    static instance: GridAutosizeService;

    private _columnWidthCalculator = new ColumnWidthCalculator();

    /**
     * Calculate and apply autosized column widths.
     *
     * @param gridModel - GridModel to autosize.
     * @param colIds - array of columns in model to compute sizing for.
     * @param options - options to use for this autosize.
     */
    async autosizeAsync(gridModel: GridModel, colIds: string[], options: GridAutosizeOptions) {
        await gridModel.whenReadyAsync();
        if (!gridModel.isReady) return;

        // 1) Check columns exist
        colIds = colIds.filter(id => gridModel.getColumn(id));
        if (isEmpty(colIds)) return;

        // 2) Ensure order of passed colIds matches the current GridModel.columnState.
        // This is to prevent changing the column order when applying column state changes
        colIds = sortBy(colIds, id => gridModel.columnState.findIndex(col => col.colId === id));

        // 3) Perform computation.  This is async and expensive, and may become obsolete
        const records = this.gatherRecordsToBeSized(gridModel, options),
            requiredWidths = await this.calcRequiredWidthsAsync(
                gridModel,
                colIds,
                records,
                options
            );

        if (!requiredWidths) {
            this.logDebug('Autosize aborted, grid data is obsolete.');
            return;
        }

        runInAction(() => {
            // 4) Set columns to their required widths.
            gridModel.applyColumnStateChanges(requiredWidths);
            this.logDebug(`Auto-sized columns`, `${records.length} records`, requiredWidths);

            // 5) Grow columns to fill any remaining space, if enabled.
            const {fillMode} = options;
            if (fillMode && fillMode !== 'none') {
                const fillWidths = this.calcFillWidths(gridModel, colIds, fillMode);
                gridModel.applyColumnStateChanges(fillWidths);
                this.logDebug('Auto-sized columns using fillMode', fillWidths);
            }
        });
    }

    //------------------
    // Implementation
    //------------------
    private async calcRequiredWidthsAsync(
        gridModel: GridModel,
        colIds: string[],
        records: StoreRecord[],
        options: GridAutosizeOptions
    ): Promise<{coldId: string; width: number}[]> {
        const startRecords = gridModel.store._filtered,
            ret = [];

        for (const colId of colIds) {
            const width = await this._columnWidthCalculator.calcWidthAsync(
                gridModel,
                records,
                colId,
                options
            );
            if (isFinite(width)) ret.push({colId, width});

            // Bail out if GridModel has moved on to new data.
            if (startRecords !== gridModel.store._filtered) return null;
        }

        return ret;
    }

    private gatherRecordsToBeSized(
        gridModel: GridModel,
        options: GridAutosizeOptions
    ): StoreRecord[] {
        let {store, agApi, treeMode, groupBy} = gridModel,
            {includeCollapsedChildren, renderedRowsOnly} = options,
            ret = [];

        if (renderedRowsOnly) {
            agApi.getRenderedNodes().forEach(node => {
                const record = store.getById(node.data?.id);
                if (record) ret.push(record);
            });
        } else if (!includeCollapsedChildren && (treeMode || groupBy)) {
            // In tree/grouped grids, included expanded rows only by default.
            for (let idx = 0; idx < agApi.getDisplayedRowCount(); idx++) {
                const node = agApi.getDisplayedRowAtIndex(idx),
                    record = store.getById(node.data?.id);
                if (record) ret.push(record);
            }
        } else if (agApi.isAnyFilterPresent()) {
            // Respect "native" ag-Grid filtering, if in use.
            agApi.forEachNodeAfterFilter(node => {
                const record = store.getById(node.data?.id);
                if (record) ret.push(record);
            });
        } else {
            // Otherwise include all records in the store (at all levels).
            ret = [...store.records];
        }

        // Ensure the summary record is always included, since it is likely to contain the largest values.
        if (gridModel.showSummary) {
            ret.push(...store.summaryRecords);
        }
        return ret;
    }

    /**
     * Calculate the increased size of columns to fill any remaining space.
     */
    private calcFillWidths(
        gridModel: GridModel,
        colIds: string[],
        fillMode: string
    ): {colId: string; width: number}[] {
        if (gridModel.getVisibleLeafColumns().some(it => it.flex)) {
            return [];
        }

        // 1) Exclude pinned columns
        colIds = colIds.filter(id => !gridModel.getColumnPinned(id));
        if (isEmpty(colIds)) return [];

        // 1) Get available width of rendered grid
        const {agApi} = gridModel,
            // @ts-ignore
            available = agApi?.gridPanel?.eBodyViewport?.clientWidth;

        if (!agApi || !isFinite(available)) {
            this.logWarn('Grid not rendered - unable to fill columns.');
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
    private fillEvenly(columns, remaining) {
        const ret = {};

        while (remaining > 0) {
            const targetColumns = columns.filter(
                col => !isFinite(col.maxWidth) || col.width < col.maxWidth
            );
            if (isEmpty(targetColumns)) break;

            const targetAdd = Math.floor(remaining / targetColumns.length);
            if (targetAdd === 0) break;

            targetColumns.forEach(col => {
                const {colId, width, maxWidth} = col,
                    currWidth = ret[colId] ?? width,
                    extraWidth = isFinite(maxWidth)
                        ? Math.min(maxWidth - currWidth, targetAdd)
                        : targetAdd;

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
    private fillSequentially(columns, remaining) {
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

    private getFillState(gridModel, colIds) {
        return {
            total: this.getTotalColumnWidth(gridModel),
            columns: compact(colIds.map(colId => this.getColumnFillState(gridModel, colId)))
        };
    }

    // Returns an array of column state representations,
    // suitable for use by the column fill algorithms.
    private getColumnFillState(gridModel, colId) {
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
    private getTotalColumnWidth(gridModel) {
        const widths = gridModel.columnState.filter(it => !it.hidden).map(it => it.width);
        return sum(widths);
    }
}
