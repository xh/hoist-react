/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {isArray} from 'lodash';

export function findByProperty(arr, property, value) {
    return arr.find(it => it[property] === value);
}

export function deepClone(a) {
    return JSON.parse(JSON.stringify(a));
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