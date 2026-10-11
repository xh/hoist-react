/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, isString} from 'lodash';

/**
 * Install a value on an options object as `originalValue` for later reference, if an
 * originalValue key has not already been set.
 * @internal
 */
export function saveOriginal(v: any, opts: PlainObject) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
}

/**
 * Throw if a string formatter factory is given an option that needs markup, or a display value
 * that is not a string. The factories' option types already reject these, so only an untyped
 * caller gets here. Failing when the formatter is created is louder than dropping the option, and
 * a formatter must never return an element - ag-Grid would show it as "[object Object]".
 * @internal
 */
export function throwIfMarkupOptions(
    opts: PlainObject,
    markupKeys: string[],
    displayKeys: string[]
) {
    markupKeys.forEach(key => {
        const v = opts[key];
        throwIf(
            !isNil(v) && v !== false,
            `Formatter option '${key}' is not supported - it needs markup, which a formatter ` +
                `cannot return. ${key === 'tooltip' ? 'Set Column.tooltip' : 'Use a renderer'} instead.`
        );
    });
    displayKeys.forEach(key => {
        const v = opts[key];
        throwIf(!isNil(v) && !isString(v), `Formatter option '${key}' must be a string.`);
    });
}
