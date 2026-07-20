/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {div, hbox, hframe, span, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import type {GridOptions, ICellRendererParams, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {useEffect, useRef} from 'react';

/** Shape of record data in the ColumnChooser's internal grids (buckets and library). */
export interface ColumnChooserData {
    id: string;
    name: string;
    description: string;
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

/**
 * agOptions shared by every chooser drag-source grid (buckets + library): multi-row dragging with a
 * "N columns" / single-column-name drag label, plus suppression of ag-grid's built-in row move -
 * drops are applied by the chooser models, never by ag-grid.
 */
export const chooserDragAgOptions: GridOptions = {
    suppressMoveWhenRowDragging: true,
    rowDragMultiRow: true,
    rowDragText: (params, count) =>
        count > 1 ? `${count} columns` : (getChooserData(params.rowNode)?.name ?? '')
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

/** Cell renderer for a chooser/library name column - grip drag handle + column name. */
export const ChooserColumnName = hoistCmp<ChooserColumnNameProps>(
    ({registerRowDragger, data: record}) => {
        const ref = useRef<HTMLSpanElement>(null);

        useEffect(() => {
            if (ref.current) registerRowDragger(ref.current);
        }, [registerRowDragger]);

        const movable = record?.data?.movable !== false;
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
                tooltip({
                    item: span({
                        className: 'xh-column-chooser__name-cell__name',
                        item: record?.data?.name ?? ''
                    }),
                    content: record?.data?.description,
                    minimal: true,
                    disabled: isEmpty(record?.data?.description)
                })
            ]
        });
    }
);
