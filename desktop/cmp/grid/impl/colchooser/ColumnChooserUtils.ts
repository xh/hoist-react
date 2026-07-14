/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import type {ICellRendererParams, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
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
