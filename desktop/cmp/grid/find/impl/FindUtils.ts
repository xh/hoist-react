/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnOrGroup, GridModel} from '@xh/hoist/cmp/grid';
import {Column} from '@xh/hoist/cmp/grid';
import type {StoreRecord} from '@xh/hoist/data';
import {stripTags} from '@xh/hoist/utils/js';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {isFunction, isNil, toString, unescape} from 'lodash';
import {isValidElement} from 'react';

/**
 * True if a column's header, or that of any group above it, matches the regex.
 *
 * @param colId - the column to test.
 * @param groupIds - ids of the column groups above it, innermost first.
 * @param regex - the query, as built by `getFilterRegex()`.
 * @internal
 */
export function isHeaderMatch(
    gridModel: GridModel,
    colId: string,
    groupIds: string[],
    regex: RegExp
): boolean {
    const column = gridModel.getColumn(colId);
    if (!column) return false;

    const matches = (it: ColumnOrGroup) => !!it && regex.test(getHeaderText(it, gridModel));
    return matches(column) || groupIds.some(id => matches(gridModel.getColumnGroup(id)));
}

/**
 * The header text shown for a column or group. Markup from an element or a function's result is
 * rendered and stripped to its text.
 * @internal
 */
export function getHeaderText(colOrGroup: ColumnOrGroup, gridModel: GridModel): string {
    const {headerName} = colOrGroup,
        value = isFunction(headerName)
            ? headerName(
                  colOrGroup instanceof Column
                      ? {column: colOrGroup, gridModel, agParams: null}
                      : {columnGroup: colOrGroup, gridModel, agParams: null}
              )
            : headerName;
    return toText(value, false);
}

/**
 * The text a cell shows for a record - its value, passed through the column's renderer or text
 * renderer. A renderer's markup is rendered and stripped to its text, as autosize does, while a
 * text renderer's output and a raw value are used as they are. Empty if the value cannot be read.
 * @internal
 */
export function getCellText(column: Column, record: StoreRecord): string {
    const {gridModel, field, renderer, resolvedRenderer} = column;
    try {
        const value = column.getValueFn({record, field, store: record.store, column, gridModel});
        return toText(
            resolvedRenderer ? resolvedRenderer(value, {record, column, gridModel}) : value,
            !!renderer
        );
    } catch {
        return '';
    }
}

// Plain text for a header or cell value. A React element is always rendered and stripped of its
// tags, and a string only when it holds a renderer's markup.
function toText(value: unknown, isMarkup: boolean): string {
    if (isNil(value)) return '';
    if (isValidElement(value)) {
        value = renderToStaticMarkup(value);
        isMarkup = true;
    }
    const ret = toString(value);
    return isMarkup ? unescape(stripTags(ret)) : ret;
}
