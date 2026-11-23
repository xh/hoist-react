/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnOrGroup, GridModel} from '@xh/hoist/cmp/grid';
import {Column} from '@xh/hoist/cmp/grid';
import {stripTags} from '@xh/hoist/utils/js';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {isFunction, isString, unescape} from 'lodash';
import {isValidElement} from 'react';

/**
 * True if a column's header, or that of any group above it, contains the query - ignoring case.
 *
 * @param colId - the column to test.
 * @param groupIds - ids of the column groups above it, innermost first.
 * @param query - the text to find.
 * @internal
 */
export function isHeaderMatch(
    gridModel: GridModel,
    colId: string,
    groupIds: string[],
    query: string
): boolean {
    const column = gridModel.getColumn(colId);
    if (!column || !query) return false;

    const q = query.toLowerCase(),
        matches = (it: ColumnOrGroup) => !!it && getHeaderText(it, gridModel).includes(q);
    return matches(column) || groupIds.some(id => matches(gridModel.getColumnGroup(id)));
}

/**
 * The header text shown for a column or group, lower-cased for matching. Markup from an element
 * or a function's result is rendered and stripped to its text.
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

    if (isString(value)) return value.toLowerCase();
    if (isValidElement(value)) {
        return unescape(stripTags(renderToStaticMarkup(value))).toLowerCase();
    }
    return '';
}
