/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import type {GridOptions, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import {makeObservable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';

import type {ColChooserModel} from './ColChooserModel';
import {
    chooserDragAgOptions,
    chooserGridConfig,
    chooserLibraryColumn,
    type ColumnChooserDropParticipant,
    type ColumnLibraryData,
    getChooserData
} from './ColumnChooserUtils';

const UNGROUPED = 'Ungrouped';

/**
 * Model backing the ColumnChooser's optional Column Library - a grid listing all currently hidden
 * columns (across every pinned side), grouped by `chooserGroup`. Acts as a cross-grid drag
 * participant: drag a column out onto a bucket to show + position it (handled by the receiving
 * bucket), or drag a bucket column onto the library to hide it (handled here, position untouched).
 */
export class ColumnLibraryModel extends HoistModel implements ColumnChooserDropParticipant {
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
            suppressGroupChangesColumnVisibility: true
        };
    }

    constructor({parent}: {parent: ColChooserModel}) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.chooserGridModel = this.createGridModel();
    }

    /** Reload the library with the currently hidden, non-excluded columns. groupBy does the rest. */
    syncFromState(columnState: ColumnState[]) {
        const {targetGridModel, chooserGridModel} = this;

        let grouped = false;
        const data: ColumnLibraryData[] = [];
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

    /** Handle a column dragged onto the library from a bucket - hide it, leaving its position. */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColumnChooserDropParticipant) {
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
        if (isEmpty(leafColIds)) return 'hide';
        return leafColIds.some(id => targetGridModel.isColumnHideable(id)) ? 'hide' : 'notAllowed';
    }

    //-----------------
    // Implementation
    //-----------------
    private createGridModel(): GridModel {
        return new GridModel({
            ...chooserGridConfig,
            sortBy: 'name',
            emptyText: 'No hidden columns',
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
                'xh-column-chooser__column-row': ({data: rec}) => rec && !rec.isSummary
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
