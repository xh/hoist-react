/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {PlainObject, Thunkable} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/core/exception/Exception';
import {
    flatMap,
    forOwn,
    isArray,
    isEmpty,
    isFunction,
    isObject,
    isPlainObject,
    isUndefined,
    mergeWith,
    mixin,
    uniq,
    uniqBy
} from 'lodash';
import _inflection from 'lodash-inflection';

mixin(_inflection);

/**
 * Get a cached value on an object, creating it if it does not yet exist.
 *
 * @param obj - object of interest. Must have writable properties.
 * @param key - key (property name) to cache value at in object.
 * @param fn - function to generate value if missing.
 * @returns value stored at key
 */
export function getOrCreate<V>(obj: any, key: any, fn: () => V): V {
    if (obj instanceof Map || obj instanceof WeakMap) {
        const val = obj.get(key);
        if (!isUndefined(val)) return val;
        const newVal = fn();
        obj.set(key, newVal);
        return newVal;
    } else {
        const val = obj[key];
        if (!isUndefined(val)) return val;
        return (obj[key] = fn());
    }
}

/**
 * Return the first defined argument - intended to allow for multiple levels of fallback values or
 * expressions when evaluating function parameters or configuration object properties.
 */
export function withDefault<T>(...args: T[]): T {
    return args.find(it => it !== undefined);
}

/**
 * Recursively freeze an object, preventing future modifications. Only the specific declared
 * input types will be frozen.  This avoids freezing other types of objects where this routine
 * could be problematic - e.g. application or library classes (such as `moment`!) which rely on
 * their internal state remaining mutable to function.
 */
export function deepFreeze<
    T extends Record<string, unknown> | Array<unknown> | Map<unknown, unknown> | Set<unknown>
>(obj: T): Readonly<T> {
    if (!(isPlainObject(obj) || isArray(obj) || obj instanceof Map || obj instanceof Set)) {
        return obj;
    }

    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        deepFreeze(obj[name]);
    }
    return Object.freeze<T>(obj);
}

/**
 * Output a deep copy of an object or array up to a given depth, beyond which nested contents will
 * be replaced by a placeholder string.
 *
 * @param obj - source object to trim
 * @param depth - maximum depth within the object tree that will be returned.
 */
export function trimToDepth(obj: any, depth: number = 1): any {
    // Return primitives and nils directly - handles recursive calls below.
    if (!isObject(obj)) return obj;

    const isArr = isArray(obj);

    // If we've reached our max depth, return placeholder string.
    if (!depth) return isArr ? '[...]' : '{...}';

    // Otherwise recurse into arrays via map...
    if (isArr) {
        return obj.map(it => trimToDepth(it, depth - 1));
    }

    // ...and objects via forOwn.
    const ret = {};
    forOwn(obj, (val, key) => {
        ret[key] = trimToDepth(val, depth - 1);
    });

    return ret;
}

/**
 * Determine if an object/value can be parsed successfully into JSON.
 */
export function isJSON(obj: any): boolean {
    try {
        JSON.parse(obj);
        return true;
    } catch (ignored) {
        return false;
    }
}

/**
 * Throw an exception if a condition evaluates as truthy.
 */
export function throwIf(condition: any, message: unknown) {
    if (condition) {
        throw Exception.create(message);
    }
}

/**
 * Log a warning to the console if a condition evaluates as truthy.
 */
export function warnIf(condition: any, message: any) {
    if (condition) {
        console.warn(message);
    }
}

/**
 * Log an error to the console if a condition evaluates as truthy.
 */
export function errorIf(condition: any, message: any) {
    if (condition) {
        console.error(message);
    }
}

export interface APIWarnOptions {
    /**
     * If provided and undefined, this method will be a no-op.
     * Useful for testing if a parameter has been provided in caller.
     */
    test?: any;

    /** Version when this API will no longer be supported or this warning should be removed. */
    v?: string;

    /** An additional message. Can contain suggestions for alternatives. */
    msg?: string;
}

/**
 * Document and prevent usage of a removed parameter.
 */
export function apiRemoved(name: string, opts: APIWarnOptions = {}) {
    if ('test' in opts && isUndefined(opts.test)) return;

    const msg = opts.msg ? ` ${opts.msg}.` : '';
    throw Exception.create(`The use of '${name}' is no longer supported.${msg}`);
}

/**
 * Document and warn on usage of a deprecated API
 *
 * @param name - the name of the deprecated parameter
 */
const _seenWarnings = {};
export function apiDeprecated(name: string, opts: APIWarnOptions = {}) {
    if ('test' in opts && isUndefined(opts.test)) return;

    const v = opts.v ?? 'a future release',
        msg = opts.msg ? ` ${opts.msg}.` : '',
        warn = `The use of '${name}' has been deprecated and will be removed in ${v}.${msg}`;
    if (!_seenWarnings[warn]) {
        console.warn(warn);
        _seenWarnings[warn] = true;
    }
}

/**
 * Throw an exception if the provided object or collection is empty, as per lodash isEmpty().
 *
 * @param obj - object or array to test.
 * @param exceptionMessage - error to throw if empty.
 */
export function ensureNotEmpty(obj: any, exceptionMessage?: string) {
    exceptionMessage = exceptionMessage ?? 'The provided object or collection cannot be empty.';
    throwIf(isEmpty(obj), exceptionMessage);
}

/**
 * Throw an exception if an array contains any duplicate, non-unique items.
 *
 * @param arr - the array to test.
 * @param exceptionMessage - error to throw if non-unique values found.
 */
export function ensureUnique(arr: any[], exceptionMessage?: string) {
    exceptionMessage = exceptionMessage ?? 'All items in the provided array must be unique.';
    throwIf(arr.length != uniq(arr).length, exceptionMessage);
}

/**
 * Throw an exception if an array contains any items with non-unique values for the provided key.
 *
 * @param arr - the array to test.
 * @param uniqueKey - the property that must hold a unique value for each item.
 * @param exceptionMessage - error to throw if non-unique values found.
 */
export function ensureUniqueBy(arr: any[], uniqueKey: string, exceptionMessage?: string) {
    exceptionMessage =
        exceptionMessage ??
        `Multiple items in the provided array have the same ${uniqueKey} - must be unique.`;
    throwIf(arr.length != uniqBy(arr, uniqueKey).length, exceptionMessage);
}

/**
 * Returns the singular version of the plural word passed to it.
 */
export function singularize(s: string): string {
    return _inflection.singularize(s);
}

/**
 * Returns the plural version of the singular word passed to it.
 *
 * @param s - the string to pluralize.
 * @param count - if provided, will pluralize to match this number
 * @param includeCount - include count in the output
 */
export function pluralize(s: string, count?: number, includeCount?: boolean): string {
    return _inflection.pluralize(s, count, includeCount);
}

/**
 * Returns the number with an ordinal suffix (i.e. 1 becomes '1st', 11 becomes '11th').
 *
 * @param n - the number to ordinalize
 */
export function ordinalize(n: number): string {
    return _inflection.ordinalize(n);
}

/**
 * Remove when lodash adds Set/Map support.
 */
export function findIn<T>(collection: Set<T> | Map<unknown, T>, fn: (it: T) => boolean): T {
    for (let it of collection.values()) {
        if (fn(it)) return it;
    }

    return null;
}

/**
 * A function to be passed to `array.filter()` that excludes consecutive items that match the
 * provided predicate.  Matches that would ultimately appear at the start or end of the
 * filtered array are also removed.
 *
 * Useful for removing separators that have become extraneous when the items they were separating
 * have been removed.
 */
export function filterConsecutive<T>(
    predicate: (it: T) => boolean
): (it: T, idx: number, arr: T[]) => boolean {
    return (it, idx, arr) => {
        if (predicate(it)) {
            // Remove if first
            if (idx === 0) return false;

            // Remove if previous item also matches
            const prev = idx > 0 ? arr[idx - 1] : null;
            if (prev && predicate(prev)) return false;

            // Remove if last or *all* subsequent items also match
            if (arr.slice(idx + 1).every(predicate)) return false;
        }

        return true;
    };
}

/**
 * Intersperse a separator between each item in an array.
 */
export function intersperse<T>(arr: T[], separator: T): T[] {
    return flatMap(arr, (it, idx) => {
        return idx > 0 ? [separator, it] : [it];
    });
}

/**
 * Return value passed or the result of executing it, if it is a function.
 */
export function executeIfFunction<T>(v: Thunkable<T>): T {
    return isFunction(v) ? v() : v;
}

/**
 * Merge objects deeply.
 *
 * Use this for merging properties from various sources into a target object.
 * The target value will be mutated and returned.
 *
 * Note that this method has the same semantics as Lodash merge, with the important exception
 * that properties containing arrays will *not* be merged element-wise.
 */
export function mergeDeep<T, S>(object: T, source: S): T & S;
export function mergeDeep<T, S1, S2>(object: T, source1: S1, source2: S2): T & S1 & S2;
export function mergeDeep<T, S1, S2, S3>(
    object: T,
    source1: S1,
    source2: S2,
    source3: S3
): T & S1 & S2 & S3;
export function mergeDeep<T, S>(target: T, ...sources: S[]): T & S;
export function mergeDeep(target: PlainObject, ...sources: PlainObject[]): PlainObject {
    return mergeWith(target, ...sources, (obj, src) => (isArray(obj) ? obj : undefined));
}
