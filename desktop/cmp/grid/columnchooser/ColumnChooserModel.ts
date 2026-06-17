/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import {HoistModel, managed} from '@xh/hoist/core';
import type {GridApi, RowDropZoneParams} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';

import {ColumnChooserBucketModel} from './ColumnChooserBucketModel';

/**
 * Model for the ColumnChooser component. Orchestrates three {@link ColumnChooserBucketModel}s -
 * one per pinned state (left, none, right) - syncing them from the target grid's columnState,
 * wiring cross-bucket drag-and-drop, and committing state changes back to the grid.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    @managed
    readonly leftBucketModel: ColumnChooserBucketModel;

    @managed
    readonly unpinnedBucketModel: ColumnChooserBucketModel;

    @managed
    readonly rightBucketModel: ColumnChooserBucketModel;

    @bindable
    showGroups: boolean = true;

    /** Cross-bucket drop zone registrations, retained for removal on bucket grid unmount. */
    private dropZoneRegistrations: Array<{sourceApi: GridApi; params: RowDropZoneParams}> = [];

    get bucketModels(): ColumnChooserBucketModel[] {
        return [this.leftBucketModel, this.unpinnedBucketModel, this.rightBucketModel];
    }

    @computed
    get hasColumnGroups(): boolean {
        if (!this.gridModel) return false;
        return this.gridModel.columns.some(c => c instanceof ColumnGroup);
    }

    @computed
    get columnPinningEnabled(): boolean {
        return this.gridModel?.enableColumnPinning ?? false;
    }

    @computed
    get gridModel(): GridModel {
        const ret = withDefault(this.componentProps?.gridModel, this.lookupModel(GridModel));
        if (!ret) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        }
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);

        this.leftBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'left',
            summaryName: 'Left Pinned',
            emptyText: 'Drop a column here to pin left'
        });

        this.unpinnedBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: null,
            summaryName: 'Columns',
            emptyText: 'No columns'
        });

        this.rightBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'right',
            summaryName: 'Right Pinned',
            emptyText: 'Drop a column here to pin right'
        });
    }

    override onLinked() {
        this.addReaction({
            track: () => [this.gridModel?.columnState, this.gridModel?.columns],
            run: () => this.syncFromGridModel(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => this.showGroups,
            run: () => this.syncFromGridModel()
        });

        // Wire cross-bucket drag-and-drop whenever the set of mounted bucket grids changes.
        // Stale registrations must be removed - ag-grid only auto-cleans drop zones when the
        // *source* grid is destroyed, leaving broken references to destroyed *target* grids.
        this.addReaction({
            track: () => this.bucketModels.map(it => it.chooserGridModel.agApi),
            run: () => this.refreshCrossBucketDropZones()
        });
    }

    async restoreDefaultsAsync() {
        await this.gridModel?.restoreDefaultsAsync();
    }

    /**
     * Commit a new normalized column state to the target GridModel. The single mutation
     * chokepoint for bucket-driven reorders and cross-bucket moves - pre-syncs the local
     * chooser stores so dropped rows appear in final position immediately, before the reaction.
     */
    @action
    commit(newState: ColumnState[]) {
        this.syncFromGridModel(newState);
        this.gridModel.setColumnState(newState);
    }

    //-----------------
    // Implementation
    //-----------------

    @action
    private syncFromGridModel(columnState?: ColumnState[]) {
        if (!this.gridModel) return;
        const cs = columnState ?? this.gridModel.columnState;
        this.bucketModels.forEach(it => it.syncFromState(cs, this.showGroups));
    }

    private refreshCrossBucketDropZones() {
        this.clearCrossBucketDropZones();
        this.installCrossBucketDropZones();
    }

    private clearCrossBucketDropZones() {
        this.dropZoneRegistrations.forEach(({sourceApi, params}) => {
            // A destroyed source already had its zones auto-removed by ag-grid.
            if (!sourceApi.isDestroyed()) sourceApi.removeRowDropZone(params);
        });
        this.dropZoneRegistrations = [];
    }

    /** Register drop zones between each pair of currently mounted bucket grids. */
    private installCrossBucketDropZones() {
        this.bucketModels.forEach(source => {
            const sourceApi = source.chooserGridModel.agApi;
            if (!sourceApi) return;

            this.bucketModels.forEach(target => {
                if (target === source) return;

                const targetApi = target.chooserGridModel.agApi;
                if (!targetApi) return;

                const params = targetApi.getRowDropZoneParams({
                    onDragStop: e => target.handleCrossBucketDrop(e, source)
                });

                if (params) {
                    // ag-grid hardcodes the external drop-zone drag icon to 'move'. Our params carry
                    // fromGrid:true so they pass through verbatim - an injected getIconName overrides
                    // that default, letting us flag drops the target bucket would reject (e.g. pinning
                    // a hidden column) with the 'not-allowed' icon.
                    (params as any).getIconName = (e: any) => target.getCrossBucketDropIcon(e);
                    sourceApi.addRowDropZone(params);
                    this.dropZoneRegistrations.push({sourceApi, params});
                }
            });
        });
    }
}
