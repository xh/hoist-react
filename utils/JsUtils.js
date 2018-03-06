/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
export function trimToDepth(obj, depth) {
    if (depth < 1) return null;

    const ret = {};
    Object.entries(obj).forEach(([key, val]) => {
        if (typeof val === 'object') {
            val = depth > 1 ? trimToDepth(val, depth - 1) : '{...}';
        }
        ret[key] = val;
    });
    return ret;
}