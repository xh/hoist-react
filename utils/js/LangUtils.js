/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {isEmpty, isObject, isObjectLike, forOwn, mixin, uniq, uniqBy} from 'lodash';
import _inflection from 'lodash-inflection';

mixin(_inflection);

/**
 * Return the first defined argument - intended to allow for multiple levels of fallback values or
 * expressions when evaluating function parameters or configuration object properties.
 */
export function withDefault(...args) {
    return args.find(it => it !== undefined);
}

/**
 * Recursively freeze an object, preventing future modifications.
 * Adapted from MDN.
 */
export function deepFreeze(obj) {
    if (!isObjectLike(obj)) return obj;

    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        deepFreeze(obj[name]);
    }
    return Object.freeze(obj);
}

/**
 * Output a shallow copy of an object up to a given depth, beyond which child objects will be
 * replaced by a placeholder string. Typically used prior to stringifying potentially recursive
 * or deeply nested objects.
 *
 * @param {Object} obj
 * @param {number} depth - maximum depth within the object tree that will be returned.
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

/**
 * Determine if an object/value can be parsed successfully into JSON.
 * @param {*} obj
 * @returns {boolean}
 */
export function isJSON(obj) {
    try {
        JSON.parse(obj);
        return true;
    } catch (ignored) {
        return false;
    }
}

/**
 * Throw an exception if a condition evaluates as truthy.
 * @param {*} condition
 * @param {string} message
 */
export function throwIf(condition, message) {
    if (condition) {
        throw XH.exception(message);
    }
}

/**
 * Log a warning to the console if a condition evaluates as truthy.
 * @param {*} condition
 * @param {string} message
 */
export function warnIf(condition, message) {
    if (condition) {
        console.warn(message);
    }
}

/**
 * Log an error to the console if a condition evaluates as truthy.
 * @param {*} condition
 * @param {string} message
 */
export function errorIf(condition, message) {
    if (condition) {
        console.error(message);
    }
}

/**
 * Throw an exception if the provided object or collection is empty, as per lodash isEmpty().
 * @link https://lodash.com/docs/latest#isEmpty
 *
 * @param {*} obj - object or array to test.
 * @param {string} [exceptionMessage] - error to throw if empty.
 */
export function ensureNotEmpty(obj, exceptionMessage) {
    exceptionMessage = withDefault(exceptionMessage,
        'The provided object or collection cannot be empty.');
    throwIf(isEmpty(obj), exceptionMessage);
}

/**
 * Throw an exception if an array contains any duplicate, non-unique items.
 *
 * @param {Array} arr - the array to test.
 * @param {string} [exceptionMessage] - error to throw if non-unique values found.
 */
export function ensureUnique(arr, exceptionMessage) {
    exceptionMessage = withDefault(exceptionMessage,
        'All items in the provided array must be unique.');
    throwIf(arr.length != uniq(arr).length, exceptionMessage);
}

/**
 * Throw an exception if an array contains any items with non-unique values for the provided key.
 *
 * @param {Array} arr - the array to test.
 * @param {string} uniqueKey - the property that must hold a unique value for each item.
 * @param {string} [exceptionMessage] - error to throw if non-unique values found.
 */
export function ensureUniqueBy(arr, uniqueKey, exceptionMessage) {
    exceptionMessage = withDefault(exceptionMessage,
        `Multiple items in the provided array have the same ${uniqueKey} - must be unique.`);
    throwIf(arr.length != uniqBy(arr, uniqueKey).length, exceptionMessage);
}

/**
 * Returns the singular version of the plural word passed to it.
 *
 * @param {string} string - the string to singularize.
 */
export function singularize(string) {
    return _inflection.singularize(string);
}

/**
 * Returns the plural version of the singular word passed to it.
 *
 * @param {string} string - the string to pluralize.
 * @param {int} [count] - if provided, will pluralize to match this number
 * @param {boolean} [includeCount] - include count in the output
 */
export function pluralize(string, count, includeCount) {
    return _inflection.pluralize(string, count, includeCount);
}

/**
 * Remove when lodash adds Set/Map support
 * @param {Set|Map} collection
 * @param {function} fn
 */
export function findIn(collection, fn) {
    for (let it of collection.values()) {
        if (fn(it)) return it;
    }

    return null;
}