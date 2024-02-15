/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';

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
