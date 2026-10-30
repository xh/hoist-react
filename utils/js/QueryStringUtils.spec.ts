/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {QueryStringOptions, stringifyQueryParams} from '@xh/hoist/utils/js';
import {describe, expect, it} from 'vitest';

/**
 * Every FetchService request encodes its params through this, so hoist-core's controllers bind
 * to exactly this output. Expected strings were recorded from `qs.stringify` with the same
 * options, which this replaced, so they pin the wire format.
 */
describe('stringifyQueryParams', () => {
    // The options FetchService applies by default.
    const fetchOpts: QueryStringOptions = {
        arrayFormat: 'repeat',
        allowDots: true,
        filter: (_, v) => (v instanceof Date ? v.getTime() : v)
    };

    it.each([
        ['repeats array values under one key', {ids: [1, 2]}, 'ids=1&ids=2'],
        [
            'flattens nested objects with dots',
            {filter: {field: 'region', value: 'EMEA'}},
            'filter.field=region&filter.value=EMEA'
        ],
        ['flattens deep nesting', {deep: {a: {b: {c: 1}}}}, 'deep.a.b.c=1'],
        ['flattens objects inside arrays', {arr: [{a: 1}, {a: 2}]}, 'arr.a=1&arr.a=2'],
        ['flattens nested arrays', {arr: [1, [2, 3]]}, 'arr=1&arr=2&arr=3'],
        [
            'applies the filter to Dates',
            {asOf: new Date('2026-10-04T14:30:00Z')},
            'asOf=1791124200000'
        ],
        [
            'encodes null as empty, omits undefined, keeps empty strings, zero and false',
            {a: null, b: undefined, c: '', d: 0, e: false, f: true},
            'a=&c=&d=0&e=false&f=true'
        ],
        ['omits empty arrays and objects', {ids: [], o: {}, after: 1}, 'after=1'],
        [
            'encodes a null inside an object or array',
            {o: {x: null}, arr: [null, 1]},
            'o.x=&arr=&arr=1'
        ],
        ['omits undefined inside an array', {arr: [undefined, 1]}, 'arr=1'],
        [
            'percent-encodes reserved characters',
            {q: 'a b&c=d/e?f#g+h'},
            'q=a%20b%26c%3Dd%2Fe%3Ff%23g%2Bh'
        ],
        [
            "encodes !'()* as RFC 3986 requires, keeping ~",
            {q: "it's (*!) ~ok~"},
            'q=it%27s%20%28%2A%21%29%20~ok~'
        ],
        ['encodes non-ASCII as UTF-8', {q: 'café 日本'}, 'q=caf%C3%A9%20%E6%97%A5%E6%9C%AC'],
        ['encodes brackets in keys', {'a[b]': 1, 'a.b': 2}, 'a%5Bb%5D=1&a.b=2'],
        [
            'stringifies numbers, including NaN and exponents',
            {n: 1.5, neg: -2, big: 1e21, nan: NaN, inf: Infinity},
            'n=1.5&neg=-2&big=1e%2B21&nan=NaN&inf=Infinity'
        ],
        ['stringifies BigInts', {bi: BigInt(5)}, 'bi=5'],
        ['returns an empty string for no params', {}, ''],
        ['returns an empty string for null params', null, '']
    ])('%s', (_, params, expected) => {
        expect(stringifyQueryParams(params, fetchOpts)).toBe(expected);
    });

    it('encodes Dates as ISO strings without a filter', () => {
        expect(stringifyQueryParams({d: new Date('2026-10-04T14:30:00Z')})).toBe(
            'd=2026-10-04T14%3A30%3A00.000Z'
        );
    });

    it.each([
        ['indices by default', {}, 'ids%5B0%5D=1&ids%5B1%5D=2'],
        ['brackets', {arrayFormat: 'brackets'}, 'ids%5B%5D=1&ids%5B%5D=2'],
        ['comma', {arrayFormat: 'comma'}, 'ids=1%2C2']
    ] as const)('keys arrays with %s', (_, opts, expected) => {
        expect(stringifyQueryParams({ids: [1, 2]}, opts)).toBe(expected);
    });

    it('keys nested objects with brackets unless allowDots is set', () => {
        expect(stringifyQueryParams({a: {b: 1}})).toBe('a%5Bb%5D=1');
        expect(stringifyQueryParams({a: [{b: 1}]})).toBe('a%5B0%5D%5Bb%5D=1');
    });

    it('omits nulls with skipNulls', () => {
        expect(stringifyQueryParams({a: null, b: 1}, {skipNulls: true})).toBe('b=1');
    });

    it('leaves keys and values unencoded with encode: false', () => {
        expect(stringifyQueryParams({q: 'a b'}, {encode: false})).toBe('q=a b');
    });

    it('keeps only the listed top-level keys with an array filter', () => {
        expect(stringifyQueryParams({a: 1, b: 2, c: 3}, {filter: ['a', 'c']})).toBe('a=1&c=3');
    });

    it('calls a filter function with each key, and with an empty key for the params object', () => {
        const keys = [];
        stringifyQueryParams(
            {a: {b: 1}, c: [2]},
            {
                allowDots: true,
                arrayFormat: 'repeat',
                filter: (key, v) => {
                    keys.push(key);
                    return v;
                }
            }
        );
        expect(keys).toEqual(['', 'a', 'a.b', 'c', 'c']);
    });

    // The options the mobile navigator uses to build a stable page key.
    it('sorts keys at every level with sort', () => {
        const opts: QueryStringOptions = {allowDots: true, sort: (a, b) => a.localeCompare(b)};
        expect(stringifyQueryParams({id: 'home', props: {b: 2, a: 1}}, opts)).toBe(
            'id=home&props.a=1&props.b=2'
        );
        expect(
            stringifyQueryParams({id: 'home', props: {list: [3, 1], z: {y: 1, x: 2}}}, opts)
        ).toBe('id=home&props.list%5B0%5D=3&props.list%5B1%5D=1&props.z.x=2&props.z.y=1');
        expect(stringifyQueryParams({id: 'home', props: null}, opts)).toBe('id=home&props=');
    });
});
