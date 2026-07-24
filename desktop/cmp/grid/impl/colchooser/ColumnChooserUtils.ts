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
 * A user-meaningful drag/drop refusal the chooser explains via an on-screen hint. Extends the drop
 * engine's movement reasons with the library-only `notHideable` (dragging a non-hideable column onto
 * the library to hide it).
 */
export type DragHintReason = DropRejectReason | 'notHideable';

/**
 * Concise status label for a refused drag/drop, shown in the drag ghost (see {@link chooserDragText})
 * so the user understands *why* the `notAllowed` cursor is showing - especially the non-obvious
 * locked-group rules. Kept to a short label (matching the framework's `movable`/`hideable` terms) to
 * fit the single-line ghost pill.
 */
export function dragRejectHint(reason: DragHintReason): string {
    switch (reason) {
        case 'notMovable':
            return 'Not Movable';
        case 'notHideable':
            return 'Not Hideable';
        case 'groupDraggedWithOthers':
        case 'multiGroupSelection':
        case 'splitsLockedGroup':
            return 'Column Groups Locked';
    }
}

/** Shape of record data in the ColumnChooser's internal grids (buckets and library). */
export interface ColumnChooserData {
    id: string;
    name: string;
    description: string;
    /** Library source-group of the underlying column - surfaced in the row's metadata tooltip. */
    chooserGroup: string;
    /** true = all visible, false = none visible, null = indeterminate (mixed). */
    visible: boolean | null;
    /**
     * Whether to dim this row. A leaf is muted when hidden; a group when all its rendered leaf
     * children are hidden. Distinct from `visible`, which tracks only *hideable* leaves for the
     * toggle control - a group of all-locked (visible) columns must not be muted.
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
 * A grid that participates in cross-grid drag-and-drop within the ColumnChooser - the three
 * pinned-side buckets and the optional Column Library. {@link ColChooserModel} wires drop zones
 * between every pair of participants.
 */
export interface ColumnChooserDropParticipant {
    chooserGridModel: GridModel;
    /** Handle a drop into this participant's grid, originating from `source`. */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColumnChooserDropParticipant): void;
    /** Drag-image icon name for a cross-grid drag hovering this participant's grid. */
    getCrossBucketDropIcon(draggingEvent: any): string;
    /** Flag a cross-bucket drag entering/leaving this participant (buckets only). */
    setDragOver?(over: boolean): void;
}

/** Extract ColumnChooserData from an ag-grid IRowNode (whose data is a StoreRecord). */
export function getChooserData(node: any): ColumnChooserData | null {
    return node?.data?.data ?? null;
}

/** Default drag-ghost label: the dragged column's name, or "N columns" for a multi-row drag. */
export function chooserDefaultDragText(dragItem: any, count: number): string {
    return count > 1 ? `${count} columns` : (getChooserData(dragItem.rowNode)?.name ?? '');
}

/**
 * Drag-ghost label getter used by every chooser drag-source grid. Shows the live refusal hint
 * ({@link dragRejectHint}, published to `dragHint` by the hovered participant) when the current drop
 * is refused, falling back to the default column-name label otherwise. ag-grid re-invokes this per
 * drag-move, so the ghost text tracks the cursor.
 */
export function chooserDragText(dragHint: string | null, dragItem: any, count: number): string {
    return dragHint ?? chooserDefaultDragText(dragItem, count);
}

/**
 * agOptions shared by every chooser drag-source grid (buckets + library): multi-row dragging with a
 * "N columns" / single-column-name drag label, plus suppression of ag-grid's built-in row move -
 * drops are applied by the chooser models, never by ag-grid. Each grid overrides `rowDragText` with
 * {@link chooserDragText} to layer in the live refusal hint (it needs the model's `dragHint`).
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
 * Base config for the chooser grids' name column - grip-handle + name via {@link ChooserColumnName}.
 * Bucket grids render it as a tree column (via `innerRenderer`); the flat library grid renders it
 * directly.
 */
export function chooserNameColumn(tree: boolean): ColumnSpec {
    return {
        field: 'name',
        flex: 1,
        rendererIsComplex: true,
        cellClass: 'xh-column-chooser__name-cell',
        ...(tree
            ? {
                  isTreeColumn: true,
                  agOptions: {
                      cellRendererParams: {
                          // Re-specify Hoist defaults — agOptions merges shallow
                          suppressCount: true,
                          suppressDoubleClickExpand: true,
                          innerRenderer: ChooserColumnName
                      }
                  }
              }
            : {agOptions: {cellRenderer: ChooserColumnName}})
    };
}

/** Shape of leaf-column record data in the Column Library's internal grid. */
export interface ColumnLibraryData {
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

/**
 * Column spec for the Column Library's flat grid - an auto-height row rendered by
 * {@link LibraryColumnCell}.
 */
export function chooserLibraryColumn(): ColumnSpec {
    return {
        field: 'name',
        flex: 1,
        rendererIsComplex: true,
        autoHeight: true,
        cellClass: 'xh-column-chooser__lib-cell',
        agOptions: {
            cellRenderer: LibraryColumnCell
        }
    };
}

interface LibraryColumnCellProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/**
 * Cell renderer for a Column Library row: a drag handle beside the column name over an optional
 * wrapped, inline description (the row auto-heights to fit it).
 */
export const LibraryColumnCell = hoistCmp<LibraryColumnCellProps>(
    ({registerRowDragger, data: record}) => {
        const ref = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (ref.current) registerRowDragger(ref.current);
        }, [registerRowDragger]);

        const data = record?.data as ColumnLibraryData;
        if (!data) return null;

        const {name, description, movable} = data,
            hasDescription = !isEmpty(description);

        const dragHandle = movable
            ? span({
                  ref,
                  className: 'xh-column-chooser__name-cell__drag-handle',
                  item: Icon.grip({prefix: 'fas'})
              })
            : span({
                  className: 'xh-column-chooser__name-cell__lock',
                  item: Icon.lock()
              });

        return hframe({
            className: 'xh-column-chooser__lib-cell__row',
            alignItems: 'center',
            items: [
                dragHandle,
                vframe({
                    className: 'xh-column-chooser__lib-cell__body',
                    items: [
                        span({className: 'xh-column-chooser__lib-cell__name', item: name}),
                        hasDescription
                            ? div({
                                  className: 'xh-column-chooser__lib-cell__desc',
                                  item: description
                              })
                            : null
                    ]
                })
            ]
        });
    }
);

interface ChooserColumnNameProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/**
 * Cell renderer for a bucket chooser name column - grip drag handle + column name, plus an on-demand
 * metadata info icon (see {@link columnMetaTooltip}). The name itself is a plain drag target: metadata
 * lives behind its own hit target so scanning the list never fires a tooltip by accident.
 */
export const ChooserColumnName = hoistCmp<ChooserColumnNameProps>(
    ({registerRowDragger, data: record}) => {
        const ref = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (ref.current) registerRowDragger(ref.current);
        }, [registerRowDragger]);

        const data = record?.data as ColumnChooserData;
        if (!data) return null;

        const {name, movable} = data;
        return hbox({
            alignItems: 'center',
            items: [
                movable
                    ? span({
                          ref,
                          className: 'xh-column-chooser__name-cell__drag-handle',
                          item: Icon.grip({prefix: 'fas'})
                      })
                    : span({
                          className: 'xh-column-chooser__name-cell__lock',
                          item: Icon.lock()
                      }),
                span({className: 'xh-column-chooser__name-cell__name', item: name ?? ''}),
                columnMetaTooltip(data)
            ]
        });
    }
);

/**
 * On-demand column metadata, revealed on hover of a small info icon trailing the name. Rendered only
 * when the column carries metadata worth surfacing (`chooserDescription`), so its mere presence
 * signals "more info here". Content mirrors the library row treatment - name as title, group as a tag,
 * description as body copy - so both panels read as one system.
 */
function columnMetaTooltip(data: ColumnChooserData): ReactNode {
    const {name, description, chooserGroup} = data,
        hasGroup = !isEmpty(chooserGroup),
        hasDesc = !isEmpty(description);
    if (!hasDesc) return null;

    return tooltip({
        className: 'xh-column-chooser__name-cell__meta',
        popoverClassName: 'xh-column-chooser__meta-popover',
        minimal: true,
        item: Icon.info(),
        content: vbox({
            className: 'xh-column-chooser__meta-tip',
            items: [
                hbox({
                    className: 'xh-column-chooser__meta-tip__header',
                    items: [
                        span({className: 'xh-column-chooser__meta-tip__title', item: name}),
                        hasGroup
                            ? span({
                                  className: 'xh-column-chooser__meta-tip__group',
                                  item: chooserGroup
                              })
                            : null
                    ]
                }),
                hasDesc
                    ? div({className: 'xh-column-chooser__meta-tip__desc', item: description})
                    : null
            ]
        })
    });
}
