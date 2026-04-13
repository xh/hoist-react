import {GridModel} from '@xh/hoist/cmp/grid';
import {span} from '@xh/hoist/cmp/layout';
import {HoistModel, managed} from '@xh/hoist/core';
import type {HSide} from '@xh/hoist/core';
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
                    {name: 'leafColIds', type: 'json'},
                    {name: 'depth', type: 'int'}
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
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        if (!record.data.hideable) return Icon.lock();
                        return record.data.visible ? Icon.checkSquare() : Icon.square();
                    }
                },
                {
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1,
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        const {name, depth, isGroup} = record.data;
                        return span({
                            style: {paddingLeft: depth * 16, fontWeight: isGroup ? 'bold' : null},
                            item: name
                        });
                    },
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

    /** Load records for this pin zone, in columnState order. */
    loadRecords(records: ColumnChooserRecord[], showGroups: boolean) {
        // Leaf records belonging to this pin zone
        const leaves = records.filter(
            r => !r.isGroup && (r.pinned ?? null) === (this.pinned ?? null)
        );
        const leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            // Flat mode: load leaf records sorted by columnState order, depth 0
            const flat = leaves
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(r => ({...r, depth: 0}));
            this.gridModel.store.loadData(flat);
            return;
        }

        // Tree mode: build a flat list in display order with depth for indentation.
        // Groups are included inline with their children, indented by nesting level.
        const groups = records.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id)));
        const groupIdSet = new Set(groups.map(r => r.id));
        // Build children map
        const childrenMap = new Map<string, ColumnChooserRecord[]>();
        for (const rec of [...groups, ...leaves]) {
            if (rec.parentId && groupIdSet.has(rec.parentId)) {
                if (!childrenMap.has(rec.parentId)) childrenMap.set(rec.parentId, []);
                childrenMap.get(rec.parentId).push(rec);
            }
        }
        // Sort children within each group by sortOrder
        for (const children of childrenMap.values()) {
            children.sort((a, b) => a.sortOrder - b.sortOrder);
        }

        // Flatten the tree in display order with depth
        const result: (ColumnChooserRecord & {depth: number})[] = [];
        const flatten = (r: ColumnChooserRecord, depth: number) => {
            result.push({...r, depth});
            const children = childrenMap.get(r.id);
            if (children) children.forEach(c => flatten(c, depth + 1));
        };

        // Root records: groups or leaves with no parent in the visible group set
        const roots = [
            ...groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            ...leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId))
        ].sort((a, b) => a.sortOrder - b.sortOrder);

        roots.forEach(r => flatten(r, 0));
        this.gridModel.store.loadData(result);
    }
}
