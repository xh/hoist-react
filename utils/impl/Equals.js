/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * @private
 */
export function shallowEqualArrays(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;

    const len = a.length;
    if (b.length !== len) return false;
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}