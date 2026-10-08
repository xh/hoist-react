/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';

/**
 * Generate a renderer for a given formatter function.
 *
 * The returned renderer takes an optional config for its assigned formatter and itself returns
 * a function that takes only a value, for convenient use with e.g. grid cell rendering.
 *
 * @param formatter - an existing formatter method.
 * @returns - a configurable renderer.
 */
export function createRenderer<V = any, C = PlainObject, R = any>(
    formatter: (v: V, obj?: C) => R
): (obj?: C) => (v: V) => R {
    return function (config) {
        return (v: V) => formatter(v, config);
    };
}

/**
 * A formatter that always returns a string, for use as a grid `Column.formatter`: ag-Grid writes
 * the text into the cell directly, with no component per cell.
 *
 * Styling that the markup-returning formatters apply inline (e.g. `colorSpec`, ledger alignment)
 * is carried instead as `cellClassRules`, which the grid applies to the cell by value.
 */
export type StringFormatter<V = any> = ((v: V, ...rest: any[]) => string) & {
    cellClassRules?: Record<string, (params: {value: any}) => boolean>;
};
