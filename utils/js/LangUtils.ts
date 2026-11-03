/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistBase, PlainObject, Thunkable} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {
    flatMap,
    forOwn,
    isArray,
    isEmpty,
    isFunction,
    isObject,
    isPlainObject,
    isString,
    isUndefined,
    mergeWith,
    uniq,
    uniqBy
} from 'lodash';
import * as inflection from 'inflection';

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
        throw Exception.create(message); // low-level exception api for low-level package
    }
}

/**
 * Instantiate a singleton object of a class, and place a reference to the created
 * object in a static property on the class.
 *
 * This pattern is useful to allow gaining typed references to the singleton via import
 * and is used for creating the singleton HoistServices, AuthModel, and AppModel.
 *
 * @param clazz -- Class (i.e. Constructor) of singleton object to be created.
 */
export function createSingleton<T>(clazz: new () => T): T {
    return (clazz['instance'] = new clazz());
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
    return inflection.singularize(s);
}

/**
 * Returns the plural version of the singular word passed to it.
 *
 * @param s - the string to pluralize.
 * @param count - if provided, will pluralize to match this number
 * @param includeCount - include count in the output
 */
export function pluralize(s: string, count?: number, includeCount?: boolean): string {
    if (count == null) return inflection.pluralize(s);
    const ret = inflection.inflect(s, count);
    return includeCount ? `${count} ${ret}` : ret;
}

/**
 * Returns the number with an ordinal suffix (i.e. 1 becomes '1st', 11 becomes '11th').
 *
 * @param n - the number to ordinalize
 */
export function ordinalize(n: number): string {
    return inflection.ordinalize(String(n));
}

/**
 * Generate a random alphanumeric ID using the platform's cryptographic random source.
 * Suitable for correlation IDs, load IDs and similar - not for secrets.
 *
 * @param length - number of characters in the generated ID. Default 8.
 */
export function genRandomId(length: number = 8): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => ID_CHARS[b % ID_CHARS.length]).join('');
}

/**
 * Generate a version 4 UUID, unique across sessions and suitable for IDs stored on a server.
 * Uses `crypto.randomUUID()` where the browser provides it. Browsers provide it only on HTTPS and
 * localhost, so on plain HTTP this builds the UUID from `crypto.getRandomValues()`.
 */
export function genUuid(): string {
    return crypto.randomUUID?.() ?? genUuidFromRandomValues();
}

/**
 * Return the value of an object's own property, or null. Never returns a property inherited from
 * `Object.prototype`, such as `constructor` or `toString`. Use it to look up a key that comes from
 * user input or a server response in a plain object used as a map.
 *
 * Unlike lodash `get` and `has`, this treats a dotted key such as `'a.b'` as a single key.
 */
export function getOwn<T>(obj: Record<string, T>, key: string): T {
    return obj != null && isString(key) && Object.hasOwn(obj, key) ? obj[key] : null;
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
 * that properties containing arrays will *not* be merged deeply.
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
    return mergeWith(target, ...sources, (tgtVal, srcVal) =>
        isArray(srcVal) ? srcVal : undefined
    );
}

/**
 * A string, or an object from which a name can be derived - via `xhName` (HoistBase instances),
 * `displayName` (e.g. React components), or `constructor.name` (class instances). Used for
 * logging and tracing.
 */
export type NameSource = string | HoistBase | {displayName: string} | {constructor: {name: string}};

/**
 * Resolve a {@link NameSource} to a string, or null if unresolvable.
 *
 * A HoistBase instance is labelled per {@link formatInstanceLabel}. Other sources resolve via
 * `xhName` or {@link parseTypeName}.
 */
export function parseNameSource(source: NameSource): string {
    if (!source) return null;
    if (isString(source)) return source;
    const typeName = parseTypeName(source);
    if (!source['isHoistBase']) return source['xhName'] || typeName;
    return formatInstanceLabel(typeName, source['xhName'], source['xhId']);
}

/**
 * Label for a HoistBase instance - `ClassName [xhName]`, or `ClassName [id]` (short `xhId`) when
 * unnamed. An `xhName` matching the class name (e.g. `fetchService`) marks a singleton and is
 * omitted.
 */
export function formatInstanceLabel(className: string, xhName: string, xhId: string): string {
    if (!xhName) return `${className} [${xhId.replace(/^xh-id-/, '')}]`;
    return xhName.toLowerCase() === className.toLowerCase()
        ? className
        : `${className} [${xhName}]`;
}

/**
 * Resolve a {@link NameSource} to its type-level name - `displayName` or `constructor.name` -
 * ignoring any instance-level `xhName`. Returns null if unresolvable.
 *
 * @internal - use {@link parseNameSource}.
 */
export function parseTypeName(source: NameSource): string {
    if (!source) return null;
    if (isString(source)) return source;
    if (source['displayName']) return source['displayName'];
    if (source.constructor) return source.constructor.name;
    return null;
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genUuidFromRandomValues(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4.
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // The RFC 9562 variant.
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
    ].join('-');
}
