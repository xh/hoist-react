/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    Column,
    ColumnFormatter,
    ColumnOrGroup,
    ColumnRenderer,
    GroupRowRenderer
} from '@xh/hoist/cmp/grid';
import type {HeaderClassParams} from '@xh/hoist/kit/ag-grid';
import {logWarn} from '@xh/hoist/utils/js';
import {castArray, isFunction} from 'lodash';

/** @internal */
export function managedRenderer<T extends ColumnRenderer | GroupRowRenderer>(
    fn: T,
    identifier: string
): T {
    if (!isFunction(fn)) return fn;
    return function (v, ctx) {
        try {
            return (fn as any)(v, ctx);
        } catch (e) {
            logWarn([`Renderer for '${identifier}' has thrown an error`, e]);
            return '#ERROR';
        }
    } as unknown as T;
}

/**
 * Wrap a formatter so that a throw shows '#ERROR' in its one cell, as `managedRenderer` does. The
 * wrapper keeps the formatter's `cellClassRules`.
 * @internal
 */
export function managedFormatter(fn: ColumnFormatter, identifier: string): ColumnFormatter {
    if (!isFunction(fn)) return fn;
    const ret: ColumnFormatter = (v, ctx) => {
        try {
            return fn(v, ctx);
        } catch (e) {
            logWarn([`Formatter for '${identifier}' has thrown an error`, e]);
            return '#ERROR';
        }
    };
    if (fn.cellClassRules) ret.cellClassRules = fn.cellClassRules;
    return ret;
}

/**
 *   Generate CSS classes for headers.
 *   Default alignment classes are mixed in with any provided custom classes.
 *
 *   @internal
 */
export function getAgHeaderClassFn(column: ColumnOrGroup): (params: HeaderClassParams) => string[] {
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
