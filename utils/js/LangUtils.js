/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {isObject, isObjectLike, forOwn, mixin} from 'lodash';
import _inflection from 'lodash-inflection';

mixin(_inflection);

/**
 * Output a shallow copy of an object up to a given depth, beyond which child objects will be
 * replaced by a placeholder string. Typically used prior to stringifying potentially recursive
 * or deeply nested objects.
 *
 * @param {Object} obj - the object to evaluate
 * @param {number} depth - maximum depth within the object tree that will be returned
 */
export function trimToDepth(obj, depth) {
    if (depth < 1) return null;

    const ret = {};
    forOwn(obj, (val, key) => {
        if (isObject(val)) {
            val = depth > 1 ? trimToDepth(val, depth - 1) : '{...}';
        }
        ret[key] = val;
    });

    return ret;
}


export function singularize(string) {
    return _inflection.singularize(string);
}

export function pluralize(string, count, includeCount) {
    return _inflection.pluralize(string, count, includeCount);
}

export function isJSON(value) {
    try {
        JSON.parse(value);
        return true;
    } catch (e) {
        return false;
    }
}

export function throwIf(condition, message) {
    if (condition) {
        throw XH.exception(message);
    }
}

export function warnIf(condition, message) {
    if (condition) {
        console.warn(message);
    }
}

export function withDefault(...args) {
    return args.find(it => it !== undefined);
}

export function deepFreeze(object) {
    // Adapted from MDN
    if (!isObjectLike(object)) return object;

    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
        deepFreeze(object[name]);
    }
    return Object.freeze(object);
}