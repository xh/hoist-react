/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hbox, span} from '@xh/hoist/cmp/layout';
import type {HSide} from '@xh/hoist/core';
import {hoistCmp, HoistModel, HoistProps, managed} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import type {
    GridOptions,
    ICellRendererParams,
    IsRowValidDropPositionParams,
    RowDragEndEvent
} from '@xh/hoist/kit/ag-grid';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';
import {useEffect, useRef} from 'react';

import type {ColumnChooserData, ColumnChooserModel} from './ColumnChooserModel';

export interface ColumnChooserBucketConfig {
    parent: ColumnChooserModel;
    pinned: HSide | null;
    /** Label shown in the bucket's docked summary header row. */
    summaryName: string;
    emptyText: string;
}

/**
 * Per-bucket model backing a single chooser grid (pinned-left, unpinned, or pinned-right).
 * The parent {@link ColumnChooserModel} drives data partitioning, mutation, and cross-cutting
 * state — buckets just own their {@link GridModel} and proxy drag/drop callbacks to the parent.
 */
export class ColumnChooserBucketModel extends HoistModel {
    override xhImpl = true;

    readonly parent: ColumnChooserModel;
    readonly pinned: HSide | null;
    readonly summaryName: string;

    @managed
    chooserGridModel: GridModel;

    @computed
    get agOptions(): GridOptions {
        return this.parent.buildAgOptions(this);
    }

    constructor({parent, pinned, summaryName, emptyText}: ColumnChooserBucketConfig) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.pinned = pinned;
        this.summaryName = summaryName;

        this.chooserGridModel = new GridModel({
            treeMode: true,
            treeStyle: 'none',
            showSummary: 'top',
            expandLevel: -1,
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'auto'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'movable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            sortBy: 'sortOrder',
            emptyText,
            hideEmptyTextBeforeLoad: false,
            selModel: 'multiple',
            hideHeaders: true,
            rowBorders: true,
            onKeyDown: e => {
                const {selectedRecords} = this.chooserGridModel;
                if (isEmpty(selectedRecords)) return;

                if (e.code === 'Space') {
                    this.parent.toggleVisibility(
                        selectedRecords.map(rec => rec.id),
                        this
                    );
                    e.stopPropagation();
                    e.preventDefault();
                }
            },
            clicksToExpand: 0,
            columns: [
                {
                    field: 'name',
                    isTreeColumn: true,
                    rendererIsComplex: true,
                    flex: 1,
                    agOptions: {
                        cellRendererParams: {
                            // Re-specify Hoist defaults — agOptions merges shallow
                            suppressCount: true,
                            suppressDoubleClickExpand: true,
                            innerRenderer: NameCell
                        }
                    }
                },
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actionsShowOnSummaryRow: true,
                    actions: [
                        {
                            icon: Icon.checkSquare(),
                            displayFn: ({record}) => {
                                if (!record.data.hideable) {
                                    if (record.isSummary) {
                                        return {hidden: true};
                                    }

                                    return {
                                        icon: Icon.lock(),
                                        disabled: true
                                    };
                                }

                                const {visible} = record.data;
                                if (visible === null) {
                                    return {icon: Icon.squareMinus()};
                                }

                                return visible
                                    ? {icon: Icon.checkSquare(), intent: 'primary'}
                                    : {icon: Icon.square(), intent: null};
                            },
                            actionFn: ({record}) =>
                                this.parent.toggleVisibility(record.data.id, this)
                        }
                    ]
                },
                {
                    field: 'sortOrder',
                    hidden: true
                }
            ]
        });
    }

    // Selection coordination — when this bucket gains a selection, clear the others.
    override onLinked() {
        this.addReaction({
            track: () => this.chooserGridModel.selectedRecord,
            run: rec => {
                if (rec) this.parent.notifyBucketSelected(this);
            }
        });
    }

    //-------
    // Wiring for parent — invoked from agOptions callbacks
    //-------
    getValidDropPosition(params: IsRowValidDropPositionParams) {
        return this.parent.getValidDropPosition(params, this);
    }

    handleRowDragEnd(event: RowDragEndEvent) {
        this.parent.handleRowDragEnd(event, this);
    }

    handleCrossBucketDrop(event: RowDragEndEvent, sourceBucket: ColumnChooserBucketModel) {
        this.parent.handleCrossBucketDrop(event, sourceBucket, this);
    }

    /**
     * Hideable leaf records currently shown (respects active filter).
     * Used by parent to compute aggregateVisibility across all buckets.
     */
    @computed
    get hideableLeafRecords() {
        return this.chooserGridModel.store.records.filter(r => !r.data.isGroup && r.data.hideable);
    }

    clearSelection() {
        this.chooserGridModel.clearSelection();
    }

    /** Get the chooser data for the row this bucket considers the "selected" row, or null. */
    get selectedData(): ColumnChooserData | null {
        return this.chooserGridModel.selectedRecord?.data as ColumnChooserData | null;
    }
}

//------------------
// Cell Renderers
//------------------

interface NameCellProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/** Inner renderer for the name (tree) column - grip drag handle + column name. */
export const NameCell = hoistCmp<NameCellProps>(({registerRowDragger, data: record}) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) registerRowDragger(ref.current);
    }, [registerRowDragger]);

    // Summary header rows show a styled label only - no drag handle.
    if (record?.isSummary) {
        return span({
            className: 'xh-column-chooser__summary-name',
            item: record.data.name ?? ''
        });
    }

    // Immovable columns render a lock icon and omit the drag handle (ref unset -> never
    // registered as a row dragger), so the row cannot be dragged.
    const movable = record?.data?.movable !== false;

    return hbox({
        alignItems: 'center',
        items: [
            movable
                ? span({
                      ref,
                      className: 'xh-column-chooser__drag-handle',
                      item: Icon.grip({prefix: 'fas'})
                  })
                : span({
                      className: 'xh-column-chooser__lock',
                      item: Icon.lock()
                  }),
            tooltip({
                item: record?.data?.name ?? '',
                content: record?.data?.description,
                minimal: true,
                disabled: isEmpty(record?.data?.description)
            })
        ]
    });
});
