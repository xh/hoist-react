/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {HoistBase} from '@xh/hoist/core';
import type {StoreRecord} from '@xh/hoist/data';
import type {GridOptions} from '@xh/hoist/kit/ag-grid';
import {computed} from '@xh/hoist/mobx';
import {isEmpty, max, maxBy} from 'lodash';
import type {GridLocalModel} from '../Grid';
import type {GridModel} from '../GridModel';

/**
 * Row heights for a Grid - the `rowHeight` and `getRowHeight` it passes to ag-Grid, and the
 * up-front evaluation of `getRowHeight` for grids whose rows vary in height.
 *
 * @internal
 */
export class RowHeightSupport extends HoistBase {
    private readonly gridLocalModel: GridLocalModel;

    constructor(gridLocalModel: GridLocalModel) {
        super();
        this.gridLocalModel = gridLocalModel;

        this.addReaction({
            track: () => [this.useScrollOptimization, this.rowHeight, this.groupRowHeight],
            run: () => {
                const {agApi} = this.gridModel;
                if (!agApi) return;
                agApi.resetRowHeights();
                this.applyScrollOptimization();
            },
            debounce: 1
        });
    }

    /** Row height options for the grid to pass to ag-Grid. */
    @computed
    get agGridProps(): Pick<GridOptions, 'rowHeight' | 'getRowHeight'> {
        return {rowHeight: this.rowHeight, getRowHeight: this.getRowHeight};
    }

    /**
     * Height of data rows - an explicit `rowHeight` option, else the height for the sizing mode,
     * raised to the tallest `Column.rowHeight` among visible columns.
     */
    @computed
    get rowHeight(): number {
        const {gridModel, agOptions} = this;
        return max([
            agOptions.rowHeight ?? AgGridCmp.getRowHeightForSizingMode(gridModel.sizingMode),
            maxBy(gridModel.getVisibleLeafColumns(), 'rowHeight')?.rowHeight
        ]);
    }

    /**
     * Height of group rows - `GridModel.groupRowHeight`, else the full-width group row height for
     * the sizing mode when groups render as `groupRows`, else the data row height (as in trees).
     */
    @computed
    get groupRowHeight(): number {
        const {gridModel, agOptions} = this;
        return (
            gridModel.groupRowHeight ??
            (agOptions.groupDisplayType === 'groupRows'
                ? AgGridCmp.getGroupRowHeightForSizingMode(gridModel.sizingMode)
                : this.rowHeight)
        );
    }

    /**
     * The app's `getRowHeight`, else Hoist's own only where rows vary - without one, ag-Grid sizes
     * every row from `rowHeight`, with no per-row calls and no estimated heights to correct.
     */
    @computed
    get getRowHeight(): GridOptions['getRowHeight'] {
        const {gridModel, agOptions} = this;
        if (agOptions.getRowHeight) return agOptions.getRowHeight;

        const hasGroupRows = !isEmpty(gridModel.groupBy) || gridModel.treeMode;
        return hasGroupRows && this.groupRowHeight !== this.rowHeight
            ? this.defaultGetRowHeight
            : null;
    }

    /** Size rows just added to the grid, where rows vary - see {@link applyScrollOptimization}. */
    noteRecordsAdded(records: StoreRecord[]) {
        if (!isEmpty(records)) this.applyScrollOptimization(records);
    }

    //------------------
    // Implementation
    //------------------
    /**
     * Evaluate and assign row heights up front, for all rows or just those added. ag-Grid otherwise
     * estimates unrendered rows at `--ag-row-height` and corrects them as they scroll into view -
     * a hitch when rows vary. Note the function is then not guaranteed to be re-called when a node
     * is rendered in the viewport.
     */
    private applyScrollOptimization(added?: StoreRecord[]) {
        if (!this.useScrollOptimization) return;

        const {agApi} = this.gridModel,
            {getRowHeight} = this,
            params = {api: agApi, context: null} as any,
            setHeight = node => {
                params.node = node;
                params.data = node.data;
                node.setRowHeight(getRowHeight(params));
            };

        if (added) {
            added.forEach(rec => {
                const node = agApi.getRowNode(rec.agId);
                if (node) setHeight(node);
            });
        } else {
            agApi.forEachNode(setHeight);
        }
        agApi.onRowHeightChanged();
    }

    get gridModel(): GridModel {
        return this.gridLocalModel.model;
    }

    // The grid's ag-Grid options. Its `rowHeight` replaces the sizing mode height, its
    // `getRowHeight` replaces Hoist's own, and its `groupDisplayType` decides group row heights.
    // `rowHeight` is read live from props, as DataView derives it from a changeable `itemHeight`.
    @computed
    private get agOptions(): GridOptions {
        const {agOptions, componentProps} = this.gridLocalModel;
        return {...agOptions, rowHeight: componentProps.agOptions?.rowHeight};
    }

    // Rows vary, and no `autoHeight` column - ag-Grid measures those itself.
    @computed
    private get useScrollOptimization(): boolean {
        return (
            !!this.getRowHeight && !this.gridModel.getVisibleLeafColumns().some(c => c.autoHeight)
        );
    }

    private defaultGetRowHeight = ({node}) => (node.group ? this.groupRowHeight : this.rowHeight);
}

const AgGridCmp = AgGrid as any;
