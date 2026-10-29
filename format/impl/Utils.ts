/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import type {ColorClassSpec} from '../FormatNumber';

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
 * Matches digits that round to zero, as a `strictZero: false` number format shows them.
 * @internal
 */
export const ROUNDED_ZERO = /^0+.?0*$/;

/** The sign classes that `colorSpec: true` applies. @internal */
export const DEFAULT_COLOR_SPEC: ColorClassSpec = {
    pos: 'xh-pos-val',
    neg: 'xh-neg-val',
    neutral: 'xh-neutral-val'
};
