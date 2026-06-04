/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import {HoistModel, managed} from '@xh/hoist/core';
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

        // Wire cross-bucket drag-and-drop once all three bucket grids have an ag api.
        this.addReaction({
            track: () => this.allBucketGridsReady,
            run: allReady => {
                if (!allReady) return;
                this.installCrossBucketDropZones();
            }
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

    private get allBucketGridsReady(): boolean {
        return this.bucketModels.every(it => it.chooserGridModel.isReady);
    }

    @action
    private syncFromGridModel(columnState?: ColumnState[]) {
        if (!this.gridModel) return;
        const cs = columnState ?? this.gridModel.columnState;
        this.bucketModels.forEach(it => it.syncFromState(cs, this.showGroups));
    }

    private installCrossBucketDropZones() {
        for (const source of this.bucketModels) {
            const sourceApi = source.chooserGridModel.agApi;
            if (!sourceApi) continue;

            for (const target of this.bucketModels) {
                if (target === source) continue;
                const targetApi = target.chooserGridModel.agApi;
                if (!targetApi) continue;
                const params = targetApi.getRowDropZoneParams({
                    onDragStop: e => target.handleCrossBucketDrop(e, source)
                });
                if (params) sourceApi.addRowDropZone(params);
            }
        }
    }
}
