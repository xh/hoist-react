import {GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {HoistModel} from '@xh/hoist/core';
import type {HSide} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';
import {PinSectionModel} from './PinSectionModel';
import {managed} from '@xh/hoist/core';

/** Shape of records in the ColumnChooser's internal grids. */
export interface ColumnChooserRecord {
    id: string;
    name: string;
    description: string;
    visible: boolean;
    pinned: HSide;
    isGroup: boolean;
    hideable: boolean;
    parentId: string;
    sortOrder: number;
    leafColIds: string[];
}

/**
 * Model for the new ColumnChooser component. Manages an internal representation of the target
 * grid's columns and provides controls for visibility toggling, reordering, and pin management.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    /** Show column groups as tree hierarchy (true) or flat leaf list (false). */
    @bindable showGroups: boolean = true;

    /** Current quick-filter text. */
    @bindable filterText: string = '';

    @managed leftPinModel = new PinSectionModel({pinned: 'left'});
    @managed centerPinModel = new PinSectionModel({pinned: null});
    @managed rightPinModel = new PinSectionModel({pinned: 'right'});

    /** The GridModel whose columns this chooser manages. */
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
    }

    override onLinked() {
        // Wire visibility toggle callbacks
        this.leftPinModel.onToggleVisibility = id => this.toggleVisibility(id);
        this.centerPinModel.onToggleVisibility = id => this.toggleVisibility(id);
        this.rightPinModel.onToggleVisibility = id => this.toggleVisibility(id);

        // React to changes in the target grid's column state
        this.addReaction({
            track: () => [this.gridModel?.columnState, this.gridModel?.columns],
            run: () => this.syncFromGridModel(),
            fireImmediately: true
        });
    }

    toggleVisibility(recordId: string) {
        const {gridModel} = this;
        if (!gridModel) return;

        const record = this.findRecord(recordId);
        if (!record || !record.data.hideable) return;

        const newHidden = record.data.visible;
        const colIds: string[] = record.data.leafColIds;

        gridModel.updateColumnState(colIds.map(colId => ({colId, hidden: newHidden})));
    }

    //------------------
    // Implementation
    //------------------
    @action
    private syncFromGridModel() {
        if (!this.gridModel) return;
        const records = this.buildRecords();
        this.leftPinModel.loadRecords(records);
        this.centerPinModel.loadRecords(records);
        this.rightPinModel.loadRecords(records);
    }

    private buildRecords(): ColumnChooserRecord[] {
        const {gridModel} = this,
            {columns, columnState} = gridModel,
            records: ColumnChooserRecord[] = [];

        const orderMap = new Map(columnState.map((cs, idx) => [cs.colId, idx]));

        const walk = (cols: ColumnOrGroup[], parentId: string = null) => {
            for (const col of cols) {
                if (col instanceof ColumnGroup) {
                    const leafCols = col.getLeafColumns();
                    const leafColIds = leafCols.map(lc => lc.colId);
                    const leafStates = leafColIds.map(id => gridModel.getStateForColumn(id));
                    const allVisible = leafStates.every(s => !s.hidden);

                    records.push({
                        id: col.groupId,
                        name: typeof col.headerName === 'string' ? col.headerName : col.groupId,
                        description: '',
                        visible: allVisible,
                        pinned: null,
                        isGroup: true,
                        hideable: leafCols.some(lc => lc.hideable),
                        parentId,
                        sortOrder: Math.min(...leafColIds.map(id => orderMap.get(id) ?? Infinity)),
                        leafColIds
                    });

                    walk(col.children, col.groupId);
                } else {
                    if (col.excludeFromChooser) continue;
                    const state = gridModel.getStateForColumn(col.colId);
                    records.push({
                        id: col.colId,
                        name: col.chooserName,
                        description: col.chooserDescription ?? '',
                        visible: !state.hidden,
                        pinned: state.pinned ?? null,
                        isGroup: false,
                        hideable: col.hideable,
                        parentId,
                        sortOrder: orderMap.get(col.colId) ?? Infinity,
                        leafColIds: [col.colId]
                    });
                }
            }
        };

        walk(columns);
        return records;
    }

    private findRecord(id: string) {
        return (
            this.leftPinModel.gridModel.store.getById(id) ??
            this.centerPinModel.gridModel.store.getById(id) ??
            this.rightPinModel.gridModel.store.getById(id)
        );
    }
}
