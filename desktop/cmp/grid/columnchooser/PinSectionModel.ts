import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import type {HSide, PlainObject} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import type {RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import type {RowDropZoneEvents} from 'ag-grid-community';
import type {ColumnChooserRecord} from './ColumnChooserModel';

/**
 * @internal
 * Model for a single pin zone within the ColumnChooser.
 * Each zone (left-pinned, center, right-pinned) has its own PinSectionModel.
 */
export class PinSectionModel extends HoistModel {
    override xhImpl = true;

    /** Which pin zone: 'left', null (center), or 'right'. */
    pinned: HSide;

    @managed
    gridModel: GridModel;

    /** Callback set by ColumnChooserModel for visibility toggling. */
    onToggleVisibility: (recordId: string) => void;

    /** Callback set by ColumnChooserModel for reorder handling. */
    onReorder: (colIds: string[], pinned: HSide) => void;

    /** Callback set by ColumnChooserModel for cross-zone drops. */
    onCrossZoneDrop: (records: ColumnChooserRecord[], targetPinned: HSide) => void;

    constructor({pinned}: {pinned: HSide}) {
        super();
        makeObservable(this);
        this.pinned = pinned;

        this.gridModel = new GridModel({
            treeMode: true,
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            emptyText: 'No columns',
            selModel: 'single',
            hideHeaders: true,
            onCellClicked: e => {
                if (e.column?.getColId() === 'visible') {
                    this.onToggleVisibility?.(e.data.id);
                }
            },
            columns: [
                {
                    colId: 'visible',
                    headerName: '',
                    width: 40,
                    align: 'center',
                    renderer: (v, {record}) => {
                        if (!record.data.hideable) return Icon.lock();
                        return v ? Icon.checkSquare() : Icon.square();
                    }
                },
                {
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1,
                    isTreeColumn: true,
                    agOptions: {
                        rowDrag: true
                    }
                }
            ]
        });
    }

    /** Handle row drag end — read new order from AG Grid and notify ColumnChooserModel. */
    onRowDragEnd(event: RowDragEndEvent) {
        const newOrder: string[] = [];
        this.gridModel.agApi?.forEachNodeAfterFilterAndSort(node => {
            if (node.data && !node.data.isGroup) {
                newOrder.push(node.data.id);
            }
        });
        if (newOrder.length > 0) {
            this.onReorder?.(newOrder, this.pinned);
        }
    }

    /**
     * Register another PinSectionModel's grid as a drop zone for this grid.
     * Rows dragged from this grid can be dropped onto the target grid.
     */
    registerDropZone(targetPinModel: PinSectionModel) {
        const targetApi = targetPinModel.gridModel.agApi;
        const sourceApi = this.gridModel.agApi;
        if (!targetApi || !sourceApi) return;

        const dropZoneParams = targetApi.getRowDropZoneParams({
            onDragStop: (event: RowDragEndEvent) => {
                this.onCrossZoneDrop?.(
                    event.nodes.map(n => n.data),
                    targetPinModel.pinned
                );
            }
        } as RowDropZoneEvents);
        sourceApi.addRowDropZone(dropZoneParams);
    }

    /** Load records for this pin zone. */
    loadRecords(records: ColumnChooserRecord[], showGroups: boolean) {
        // Leaf records belonging to this pin zone
        const leaves = records.filter(
            r => !r.isGroup && (r.pinned ?? null) === (this.pinned ?? null)
        );
        const leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            // Flat mode: load leaf records with no parent nesting
            this.gridModel.store.loadData(leaves);
            return;
        }

        // Tree mode: build nested structure with groups as parents
        const groups = records.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id)));
        const groupIdSet = new Set(groups.map(r => r.id));

        // Build a map of group -> children (both subgroups and leaves)
        const childrenMap = new Map<string, ColumnChooserRecord[]>();
        for (const leaf of leaves) {
            if (leaf.parentId && groupIdSet.has(leaf.parentId)) {
                if (!childrenMap.has(leaf.parentId)) childrenMap.set(leaf.parentId, []);
                childrenMap.get(leaf.parentId).push(leaf);
            }
        }
        for (const group of groups) {
            if (group.parentId && groupIdSet.has(group.parentId)) {
                if (!childrenMap.has(group.parentId)) childrenMap.set(group.parentId, []);
                childrenMap.get(group.parentId).push(group);
            }
        }

        // Recursive function to build nested record with children array
        const buildNested = (r: ColumnChooserRecord): PlainObject => {
            const children = childrenMap.get(r.id);
            return children ? {...r, children: children.map(buildNested)} : {...r};
        };

        // Root records are groups or leaves with no parent in the visible group set
        const rootGroups = groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId));
        const rootLeaves = leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId));
        const rootRecords = [...rootGroups, ...rootLeaves].map(buildNested);

        this.gridModel.store.loadData(rootRecords);
    }
}
