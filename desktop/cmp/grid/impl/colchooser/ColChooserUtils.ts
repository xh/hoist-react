/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {div, hbox, hframe, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import type {GridOptions, ICellRendererParams, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {type ReactNode, useEffect, useRef} from 'react';

import type {DropRejectReason} from './colChooserDropEngine';

/**
 * A drag/drop refusal the chooser explains via an on-screen hint - the drop engine's reasons plus the
 * library-only `notHideable` and the bucket-only `pinningDisabled`.
 */
export type DragHintReason = DropRejectReason | 'notHideable' | 'pinningDisabled';

/**
 * Status label for a refused drag/drop, shown in the drag ghost. Keep these short enough for the
 * single-line ghost pill, and worded to match the framework's `movable`/`hideable` terms.
 */
export function dragRejectHint(reason: DragHintReason): string {
    switch (reason) {
        case 'notMovable':
            return 'Not Movable';
        case 'notHideable':
            return 'Not Hideable';
        case 'pinningDisabled':
            return 'Pinning Disabled';
        case 'groupDraggedWithOthers':
        case 'multiGroupSelection':
            return 'Column Groups Locked';
    }
}

/** Shape of record data in the ColChooser's internal grids (buckets and library). */
export interface ColChooserData {
    id: string;
    name: string;
    description: string;
    /** Library source-group of the underlying column - surfaced in the row's metadata tooltip. */
    chooserGroup: string;
    /** true = all visible, false = none visible, null = indeterminate (mixed). */
    visible: boolean | null;
    /**
     * Whether to dim this row - a leaf when hidden, a group when all its rendered leaf children are.
     * Distinct from `visible`, which counts only *hideable* leaves, so an all-locked group is not muted.
     */
    muted: boolean;
    isGroup: boolean;
    hideable: boolean;
    movable: boolean;
    parentId: string;
    sortOrder: number;
    leafColIds: string[];
    /** True for records sourced from the Column Library - a drop from there always unhides. */
    fromLibrary?: boolean;
}

/**
 * A grid participating in cross-grid drag-and-drop within the ColChooser - the three pinned-side
 * buckets and the optional Column Library. {@link ColChooserModel} wires drop zones between each pair.
 */
export interface ColChooserDropParticipant {
    chooserGridModel: GridModel;
    /** Handle a drop into this participant's grid, originating from `source`. */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColChooserDropParticipant): void;
    /** Drag-image icon name for a cross-grid drag hovering this participant's grid. */
    getCrossBucketDropIcon(draggingEvent: any): string;
    /** Flag a cross-bucket drag entering/leaving this participant (buckets only). */
    setDragOver?(over: boolean): void;
}

/** Extract ColChooserData from an ag-grid IRowNode (whose data is a StoreRecord). */
export function getChooserData(node: any): ColChooserData | null {
    return node?.data?.data ?? null;
}

/** Default drag-ghost label: the dragged column's name, or "N columns" for a multi-row drag. */
export function chooserDefaultDragText(dragItem: any, count: number): string {
    return count > 1 ? `${count} columns` : (getChooserData(dragItem.rowNode)?.name ?? '');
}

/**
 * Drag-ghost label for every chooser drag-source grid - the live refusal hint when the current drop is
 * refused, else the default column-name label. ag-grid re-invokes this per drag-move.
 */
export function chooserDragText(dragHint: string | null, dragItem: any, count: number): string {
    return dragHint ?? chooserDefaultDragText(dragItem, count);
}

/**
 * agOptions shared by every chooser drag-source grid. Suppresses ag-grid's built-in row move - drops
 * are applied by the chooser models. Each grid overrides `rowDragText` with {@link chooserDragText},
 * which needs the model's `dragHint`.
 */
export const chooserDragAgOptions: GridOptions = {
    suppressMoveWhenRowDragging: true,
    rowDragMultiRow: true,
    rowDragText: chooserDefaultDragText
};

/** Base GridModel config shared by the chooser's bucket and library grids. */
export const chooserGridConfig: Partial<GridConfig> = {
    hideEmptyTextBeforeLoad: false,
    selModel: 'multiple',
    hideHeaders: true,
    rowBorders: true,
    stripeRows: false,
    showHover: true,
    contextMenu: false
};

/**
 * Base config for the chooser grids' name column - grip-handle + name via {@link ChooserColName}. Bucket
 * grids render it as a tree column via `innerRenderer`; the flat library grid renders it directly.
 */
export function chooserNameColumn(tree: boolean): ColumnSpec {
    return {
        field: 'name',
        flex: 1,
        rendererIsComplex: true,
        cellClass: 'xh-col-chooser__name-cell',
        ...(tree
            ? {
                  isTreeColumn: true,
                  agOptions: {
                      cellRendererParams: {
                          // Re-specify Hoist defaults - agOptions merges shallow
                          suppressCount: true,
                          suppressDoubleClickExpand: true,
                          innerRenderer: ChooserColName
                      }
                  }
              }
            : {agOptions: {cellRenderer: ChooserColName}})
    };
}

/** Shape of leaf-column record data in the Column Library's internal grid. */
export interface ColLibraryData {
    id: string;
    name: string;
    description: string;
    chooserGroup: string;
    movable: boolean;
    /** Always false - the library has no draggable group records (groupBy renders group rows). */
    isGroup: boolean;
    /** Always `[id]` - the leaves the receiving bucket should show on drop. */
    leafColIds: string[];
    /** Always true - tells the receiving bucket to unhide on drop (see ColChooserBucketModel). */
    fromLibrary: boolean;
}

/** Column spec for the Column Library's flat grid - auto-height rows via {@link LibraryColCell}. */
export function chooserLibraryColumn(): ColumnSpec {
    return {
        field: 'name',
        flex: 1,
        rendererIsComplex: true,
        autoHeight: true,
        cellClass: 'xh-col-chooser__lib-cell',
        agOptions: {
            cellRenderer: LibraryColCell
        }
    };
}

interface LibraryColCellProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/**
 * Cell renderer for a Column Library row - a drag handle beside the column name, over an optional
 * wrapped inline description.
 * @internal
 */
export const LibraryColCell = hoistCmp<LibraryColCellProps>(
    ({registerRowDragger, data: record}) => {
        const ref = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (ref.current) registerRowDragger(ref.current);
        }, [registerRowDragger]);

        const data = record?.data as ColLibraryData;
        if (!data) return null;

        const {name, description, movable} = data,
            hasDescription = !isEmpty(description);

        const dragHandle = movable
            ? span({
                  ref,
                  className: 'xh-col-chooser__name-cell__drag-handle',
                  item: Icon.grip({prefix: 'fas'})
              })
            : span({
                  className: 'xh-col-chooser__name-cell__lock',
                  item: Icon.lock()
              });

        return hframe({
            className: 'xh-col-chooser__lib-cell__row',
            alignItems: 'center',
            items: [
                dragHandle,
                vframe({
                    className: 'xh-col-chooser__lib-cell__body',
                    items: [
                        span({className: 'xh-col-chooser__lib-cell__name', item: name}),
                        hasDescription
                            ? div({
                                  className: 'xh-col-chooser__lib-cell__desc',
                                  item: description
                              })
                            : null
                    ]
                })
            ]
        });
    }
);

interface ChooserColNameProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/**
 * Cell renderer for a bucket chooser name column - grip drag handle + column name, plus an on-demand
 * metadata icon. Metadata sits behind its own hit target, so scanning the list never fires a tooltip.
 * @internal
 */
export const ChooserColName = hoistCmp<ChooserColNameProps>(
    ({registerRowDragger, data: record}) => {
        const ref = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (ref.current) registerRowDragger(ref.current);
        }, [registerRowDragger]);

        const data = record?.data as ColChooserData;
        if (!data) return null;

        const {name, movable} = data;
        return hbox({
            alignItems: 'center',
            items: [
                movable
                    ? span({
                          ref,
                          className: 'xh-col-chooser__name-cell__drag-handle',
                          item: Icon.grip({prefix: 'fas'})
                      })
                    : span({
                          className: 'xh-col-chooser__name-cell__lock',
                          item: Icon.lock()
                      }),
                span({className: 'xh-col-chooser__name-cell__name', item: name ?? ''}),
                columnMetaTooltip(data)
            ]
        });
    }
);

/**
 * On-demand column metadata, revealed on hover of a small info icon trailing the name. Rendered only
 * when the column has a `chooserDescription`, so the icon's presence itself signals "more info here".
 */
function columnMetaTooltip(data: ColChooserData): ReactNode {
    const {name, description, chooserGroup} = data,
        hasGroup = !isEmpty(chooserGroup),
        hasDesc = !isEmpty(description);
    if (!hasDesc) return null;

    return tooltip({
        className: 'xh-col-chooser__name-cell__meta',
        popoverClassName: 'xh-col-chooser__meta-popover',
        minimal: true,
        item: Icon.info(),
        content: vbox({
            className: 'xh-col-chooser__meta-tip',
            items: [
                hbox({
                    className: 'xh-col-chooser__meta-tip__header',
                    items: [
                        span({className: 'xh-col-chooser__meta-tip__title', item: name}),
                        hasGroup
                            ? span({
                                  className: 'xh-col-chooser__meta-tip__group',
                                  item: chooserGroup
                              })
                            : null
                    ]
                }),
                hasDesc
                    ? div({className: 'xh-col-chooser__meta-tip__desc', item: description})
                    : null
            ]
        })
    });
}
