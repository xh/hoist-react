/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {isArray, isDate, isFunction, isPlainObject} from 'lodash';

export interface QueryStringOptions {
    /**
     * How array values are keyed. Default 'indices' - `ids[0]=1&ids[1]=2`. Also 'repeat' -
     * `ids=1&ids=2`, 'brackets' - `ids[]=1&ids[]=2`, and 'comma' - `ids=1,2`.
     */
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';

    /** True to key nested objects with dots - `a.b=1` - rather than brackets - `a[b]=1`. */
    allowDots?: boolean;

    /** True to omit null values. By default a null encodes as an empty value - `a=`. */
    skipNulls?: boolean;

    /** False to leave keys and values unencoded. Default true. */
    encode?: boolean;

    /** Comparator to order keys, applied at every level of nesting. */
    sort?: (a: string, b: string) => number;

    /**
     * Function to transform each value before it is encoded, called with the value's full key
     * (an empty string for the params object itself) - or the top-level keys to keep.
     */
    filter?: ((key: string, value: any) => any) | string[];
}

/**
 * Encode an object as a URL query string, without a leading `?`.
 *
 * Nested objects and arrays are flattened into keyed entries, as hoist-core's controllers bind
 * them. Undefined values are omitted, Dates encode as ISO strings, and everything else encodes
 * as its string form. Keys and values are percent-encoded per RFC 3986, so that `!'()*` are
 * encoded as well as the characters `encodeURIComponent` covers.
 */
export function stringifyQueryParams(params: PlainObject, opts: QueryStringOptions = {}): string {
    const {filter} = opts,
        filterFn = isFunction(filter) ? filter : null,
        keys = isArray(filter) ? filter : Object.keys(params ?? {}),
        value = filterFn ? filterFn('', params) : params,
        out: string[] = [];

    if (isPlainObject(value)) {
        for (const key of sortKeys(keys, opts)) {
            if (key in value) appendEntries(out, key, value[key], opts, filterFn);
        }
    }
    return out.join('&');
}

//------------------------
// Implementation
//------------------------
function appendEntries(
    out: string[],
    key: string,
    value: any,
    opts: QueryStringOptions,
    filterFn: (key: string, value: any) => any
) {
    if (filterFn) value = filterFn(key, value);
    if (value === undefined) return;

    if (value === null) {
        if (!opts.skipNulls) out.push(encodePart(key, opts) + '=');
    } else if (isArray(value)) {
        const {arrayFormat = 'indices'} = opts;
        if (arrayFormat === 'comma') {
            if (value.length) appendEntries(out, key, value.join(','), opts, null);
        } else {
            value.forEach((item, i) => {
                const itemKey =
                    arrayFormat === 'repeat'
                        ? key
                        : arrayFormat === 'brackets'
                          ? `${key}[]`
                          : `${key}[${i}]`;
                appendEntries(out, itemKey, item, opts, filterFn);
            });
        }
    } else if (isPlainObject(value)) {
        for (const childKey of sortKeys(Object.keys(value), opts)) {
            const nestedKey = opts.allowDots ? `${key}.${childKey}` : `${key}[${childKey}]`;
            appendEntries(out, nestedKey, value[childKey], opts, filterFn);
        }
    } else {
        const str = isDate(value) && !isNaN(value.getTime()) ? value.toISOString() : String(value);
        out.push(encodePart(key, opts) + '=' + encodePart(str, opts));
    }
}

function sortKeys(keys: string[], opts: QueryStringOptions): string[] {
    return opts.sort ? [...keys].sort(opts.sort) : keys;
}

function encodePart(str: string, opts: QueryStringOptions): string {
    if (opts.encode === false) return str;
    return encodeURIComponent(str).replace(
        /[!'()*]/g,
        c => '%' + c.charCodeAt(0).toString(16).toUpperCase()
    );
}
