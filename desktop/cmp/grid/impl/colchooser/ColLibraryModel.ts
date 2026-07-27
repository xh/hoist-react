/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import type {Some} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import {StoreRecordId} from '@xh/hoist/data';
import type {GridOptions, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import {makeObservable} from '@xh/hoist/mobx';
import {castArray, isEmpty} from 'lodash';

import type {ColChooserModel} from './ColChooserModel';
import {
    chooserDragAgOptions,
    chooserDragText,
    chooserGridConfig,
    chooserLibraryColumn,
    dragRejectHint,
    type ColChooserDropParticipant,
    type ColLibraryData,
    getChooserData
} from './ColChooserUtils';

const UNGROUPED = 'Ungrouped';

/**
 * Model backing the ColChooser's optional Column Library - a grid listing all currently hidden
 * columns (across every pinned side), grouped by `chooserGroup`. Acts as a cross-grid drag
 * participant: drag a column out onto a bucket to show + position it (handled by the receiving
 * bucket), or drag a bucket column onto the library to hide it (handled here, position untouched).
 */
export class ColLibraryModel extends HoistModel implements ColChooserDropParticipant {
    override xhImpl = true;

    readonly parent: ColChooserModel;

    @managed
    chooserGridModel: GridModel;

    /** The target GridModel whose columns this library reflects. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            ...chooserDragAgOptions,
            suppressGroupChangesColumnVisibility: true,
            rowDragText: (dragItem, count) =>
                chooserDragText(this.parent.dragHint, dragItem, count),
            onCellDoubleClicked: event => {
                const id = event.data?.data?.id;
                if (id) this.toggleVisibility(id);
            }
        };
    }

    constructor({parent, collapseGroups}: {parent: ColChooserModel; collapseGroups: boolean}) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.collapseGroups = collapseGroups;
        this.chooserGridModel = this.createGridModel();
    }

    /** Reload the library with the currently hidden, non-excluded columns. groupBy does the rest. */
    syncFromState(columnState: ColumnState[]) {
        const {targetGridModel, chooserGridModel} = this;

        let grouped = false;
        const data: ColLibraryData[] = [];
        columnState.forEach(cs => {
            if (!cs.hidden) return;
            const col = targetGridModel.getColumn(cs.colId);
            if (!col || col.excludeFromChooser) return;
            if (col.chooserGroup) grouped = true;
            data.push({
                id: cs.colId,
                name: col.chooserName,
                description: col.chooserDescription ?? '',
                chooserGroup: col.chooserGroup ?? UNGROUPED,
                movable: col.movable,
                isGroup: false,
                leafColIds: [cs.colId],
                fromLibrary: true
            });
        });

        // Only group when some hidden column actually declares a chooserGroup - otherwise a lone
        // "Ungrouped" header would wrap an ungrouped grid.
        chooserGridModel.setGroupBy(grouped ? 'chooserGroup' : null);
        chooserGridModel.store.loadData(data);
    }

    /**
     * Show the given (currently hidden) library rows in place - sets `hidden: false` on their
     * underlying column state without repositioning them. They reappear wherever they already sit
     * in the master order once routed back out of the library.
     */
    toggleVisibility(recordIds: Some<StoreRecordId>) {
        const {store} = this.chooserGridModel,
            colIds = new Set<string>();

        castArray(recordIds).forEach(id => {
            const record = store.getById(id);
            record?.data.leafColIds.forEach((colId: string) => colIds.add(colId));
        });
        if (!colIds.size) return;

        const newState = this.parent.currentState.map(cs =>
            colIds.has(cs.colId) ? {...cs, hidden: false} : cs
        );
        this.parent.applyState(newState);
    }

    /** Handle a column dragged onto the library from a bucket - hide it, leaving its position. */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColChooserDropParticipant) {
        if (source === this) return;

        const {targetGridModel} = this,
            hideIds = new Set(
                (event.nodes ?? [])
                    .flatMap(node => getChooserData(node)?.leafColIds ?? [])
                    // A movable-but-locked column can be dragged here - never hide it. Dropping one
                    // (or a group's locked leaves) is a no-op.
                    .filter(colId => targetGridModel.isColumnHideable(colId))
            );
        if (!hideIds.size) return;

        const newState = this.parent.currentState.map(cs =>
            hideIds.has(cs.colId) ? {...cs, hidden: true} : cs
        );
        this.parent.applyState(newState);
    }

    getCrossBucketDropIcon(draggingEvent: any): string {
        const {targetGridModel} = this,
            dragItem = draggingEvent?.dragItem,
            nodes = dragItem?.rowNodes?.length
                ? dragItem.rowNodes
                : dragItem?.rowNode
                  ? [dragItem.rowNode]
                  : [],
            leafColIds: string[] = nodes.flatMap((n: any) => getChooserData(n)?.leafColIds ?? []);

        // Refuse a drag with no hideable leaf - dropping it here would be a no-op. A partially
        // hideable group is still allowed, hiding only its hideable leaves (see handleCrossBucketDrop).
        if (isEmpty(leafColIds) || leafColIds.some(id => targetGridModel.isColumnHideable(id))) {
            this.parent.setDragHint(null);
            return 'hide';
        }
        this.parent.setDragHint(dragRejectHint('notHideable'));
        return 'notAllowed';
    }

    /** Render `chooserGroup` groups collapsed by default (see {@link ColLibraryConfig}). */
    private readonly collapseGroups: boolean;

    private createGridModel(): GridModel {
        return new GridModel({
            ...chooserGridConfig,
            // 0 collapses groups by default; standard non-tree default of 1 expands them.
            expandLevel: this.collapseGroups ? 0 : 1,
            sortBy: 'name',
            emptyText: 'No hidden columns',
            onKeyDown: e => {
                const {selectedRecords} = this.chooserGridModel;
                if (isEmpty(selectedRecords)) return;

                if (e.code === 'Space') {
                    this.toggleVisibility(selectedRecords.map(rec => rec.id));
                    e.stopPropagation();
                    e.preventDefault();
                }
            },
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'chooserGroup', type: 'string'},
                    {name: 'movable', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'leafColIds', type: 'json'},
                    {name: 'fromLibrary', type: 'bool'}
                ]
            },
            rowClassRules: {
                'xh-col-chooser__column-row': ({data: rec}) => rec && !rec.isSummary
            },
            columns: [
                chooserLibraryColumn(),
                {
                    field: 'chooserGroup',
                    hidden: true
                }
            ]
        });
    }
}
