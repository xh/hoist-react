/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import type {GridOptions, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';

import type {ColumnChooserModel} from '../ColumnChooserModel';
import {
    ChooserColumnName,
    type ColumnChooserDropParticipant,
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

    readonly parent: ColumnChooserModel;

    @managed
    chooserGridModel: GridModel;

    /** The target GridModel whose columns this library reflects. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            suppressGroupChangesColumnVisibility: true,
            suppressMoveWhenRowDragging: true,
            rowDragMultiRow: true,
            rowDragText: (params, count) =>
                count > 1 ? `${count} columns` : (getChooserData(params.rowNode)?.name ?? '')
        };
    }

    constructor({parent}: {parent: ColumnChooserModel}) {
        super();
        this.parent = parent;
        this.chooserGridModel = this.createGridModel();
    }

    /** Reload the library with the currently hidden, non-excluded columns. groupBy does the rest. */
    syncFromState(columnState: ColumnState[]) {
        const {targetGridModel, chooserGridModel} = this;
        if (!targetGridModel) return;

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
                    .filter(colId => targetGridModel.getColumn(colId)?.hideable)
            );
        if (!hideIds.size) return;

        const newState = targetGridModel.columnState.map(cs =>
            hideIds.has(cs.colId) ? {...cs, hidden: true} : cs
        );
        this.parent.commit(newState);
    }

    getCrossBucketDropIcon(): string {
        return 'hide';
    }

    //-----------------
    // Implementation
    //-----------------
    private createGridModel(): GridModel {
        return new GridModel({
            sortBy: 'name',
            emptyText: 'No hidden columns',
            hideEmptyTextBeforeLoad: false,
            selModel: 'multiple',
            hideHeaders: true,
            rowBorders: true,
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
                {
                    field: 'name',
                    flex: 1,
                    rendererIsComplex: true,
                    cellClass: 'xh-column-chooser__name-cell',
                    agOptions: {cellRenderer: ChooserColumnName}
                },
                {
                    field: 'chooserGroup',
                    hidden: true
                }
            ]
        });
    }
}

/** Shape of leaf-column record data in the Column Library's internal grid. */
interface ColumnLibraryData {
    id: string;
    name: string;
    description: string;
    chooserGroup: string;
    movable: boolean;
    /** Always false - the library has no draggable group records (groupBy renders group rows). */
    isGroup: boolean;
    /** Always `[id]` - the leaves the receiving bucket should show on drop. */
    leafColIds: string[];
    /** Always true - tells the receiving bucket to unhide on drop (see ColumnChooserBucketModel). */
    fromLibrary: boolean;
}
