/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isArray, cloneDeep, isEqual} from 'lodash';

export function findByProperty(arr, property, value) {
    return arr.find(it => it[property] === value);
}

export function deepClone(a) {
    return cloneDeep(a);
}

export function deepEquals(a, b) {
    return isEqual(a, b);
}

export function shallowClone(a) {
    return Object.assign({}, a);
}

export function asArray(val) {
    if (val === undefined || val === null) return [];
    if (isArray(val)) return val;
    return [val];
}

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