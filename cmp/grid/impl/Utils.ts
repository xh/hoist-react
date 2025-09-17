/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Column, ColumnGroup, ColumnRenderer, GroupRowRenderer} from '@xh/hoist/cmp/grid';
import {HeaderClassParams} from '@xh/hoist/kit/ag-grid';
import {logWarn} from '@xh/hoist/utils/log';
import {castArray, isFunction} from 'lodash';

/** @internal */
export function managedRenderer<T extends ColumnRenderer | GroupRowRenderer>(
    fn: T,
    identifier: string
): T {
    if (!isFunction(fn)) return fn;
    return function () {
        try {
            return fn.apply(null, arguments);
        } catch (e) {
            logWarn([`Renderer for '${identifier}' has thrown an error`, e]);
            return '#ERROR';
        }
    } as unknown as T;
}

/**
 *   Generate CSS classes for headers.
 *   Default alignment classes are mixed in with any provided custom classes.
 *
 *   @internal
 */
export function getAgHeaderClassFn(
    column: Column | ColumnGroup
): (params: HeaderClassParams) => string[] {
    const {headerClass, headerAlign, gridModel} = column;

    return agParams => {
        let r = [];
        if (headerClass) {
            r = castArray(
                isFunction(headerClass) ? headerClass({column, gridModel, agParams}) : headerClass
            );
        }

        if (headerAlign === 'center' || headerAlign === 'right') {
            r.push('xh-column-header-align-' + headerAlign);
        }

        if (column instanceof Column && column.isTreeColumn && column.headerHasExpandCollapse) {
            r.push('xh-column-header--with-expand-collapse');
        }

        if (gridModel.headerMenuDisplay === 'hover') {
            r.push('xh-column-header--hoverable');
        }

        return r;
    };
}
