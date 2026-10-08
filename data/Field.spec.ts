/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Field, type FieldType, genDisplayName, parseFieldValue, Store} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Field parsing and defaults. Every value loaded into a Store or Cube passes through
 * `parseFieldValue()`, so a change here silently alters the data behind every grid and chart.
 */

// Field and parseFieldValue read their XSS default from the app's AppSpec.
beforeAll(() => initTestAppAsync());

describe('parseFieldValue', () => {
    it.each<[any, FieldType, any]>([
        [123, 'string', '123'],
        ['42', 'int', 42],
        [3.9, 'int', 3],
        [-3.9, 'int', -3],
        // Fixed in 38.1.0 - parseInt read '1e3' as 1, and passed NaN through.
        ['1e3', 'int', 1000],
        ['abc', 'int', null],
        ['1.5', 'number', 1.5],
        [1, 'bool', true],
        [0, 'bool', false],
        ['a', 'tags', ['a']],
        [['a', 1], 'tags', ['a', '1']]
    ])('parses %j as %s', (val, type, expected) => {
        expect(parseFieldValue(val, type)).toEqual(expected);
    });

    it('passes auto and json values through unchanged', () => {
        const obj = {a: 1};
        expect(parseFieldValue(obj, 'auto')).toBe(obj);
        expect(parseFieldValue(obj, 'json')).toBe(obj);
        // RestGrid edits json fields as text, so a JSON string must stay a string.
        expect(parseFieldValue('{"a":1}', 'json')).toBe('{"a":1}');
    });

    it.each<FieldType>(['bool', 'int', 'number', 'string', 'tags', 'date', 'localDate'])(
        'keeps null and undefined as null in %s fields',
        type => {
            expect(parseFieldValue(null, type)).toBeNull();
            expect(parseFieldValue(undefined, type)).toBeNull();
        }
    );

    describe('date', () => {
        it('parses ISO strings and epoch millis', () => {
            const expected = new Date(2026, 2, 15, 9, 30);
            expect(parseFieldValue('2026-03-15T09:30:00', 'date')).toEqual(expected);
            expect(parseFieldValue(expected.getTime(), 'date')).toEqual(expected);
        });

        // Fixed in 82.0.0 - a LocalDate was parsed via `new Date()`, i.e. as UTC midnight.
        it('converts a LocalDate to local midnight on the same day', () => {
            const ret = parseFieldValue(LocalDate.get('2026-03-15'), 'date');
            expect(ret).toEqual(new Date(2026, 2, 15));
        });
    });

    describe('localDate', () => {
        it('parses both supported string formats to the same memoized LocalDate', () => {
            const expected = LocalDate.get('2026-03-15');
            expect(parseFieldValue('2026-03-15', 'localDate')).toBe(expected);
            expect(parseFieldValue('20260315', 'localDate')).toBe(expected);
        });

        it('converts a Date to its local calendar day', () => {
            const ret = parseFieldValue(new Date(2026, 2, 15, 23, 59), 'localDate');
            expect(ret).toBe(LocalDate.get('2026-03-15'));
        });
    });
});

describe('Field', () => {
    describe('defaultValue', () => {
        it('is parsed per type at construction and returned for nullish values', () => {
            const field = new Field({name: 'asOf', type: 'localDate', defaultValue: '2026-01-01'});
            expect(field.defaultValue).toBe(LocalDate.get('2026-01-01'));
            expect(field.parseVal(null)).toBe(field.defaultValue);
            expect(field.parseVal(undefined)).toBe(field.defaultValue);
        });

        // Fixed in 88.0.0 - records got the raw default when the source omitted the key.
        it('gives records the parsed default whether the source omits a value or sends null', () => {
            const store = new Store({
                fields: [{name: 'asOf', type: 'localDate', defaultValue: '2026-01-01'}],
                data: [{id: 1}, {id: 2, asOf: null}]
            });
            onTestFinished(() => store.destroy());

            const expected = LocalDate.get('2026-01-01');
            expect(store.getById(1).get('asOf')).toBe(expected);
            expect(store.getById(2).get('asOf')).toBe(expected);
            expect(store.getById(1).getValues().asOf).toBe(expected);
        });
    });

    describe('enableXssProtection', () => {
        const markup = '<b>Hi</b><img src="x" onerror="alert(1)"><script>alert(2)</script>';

        it('sanitizes strings in string, auto and tags fields when enabled', () => {
            const parse = (type: FieldType, val: any) =>
                new Field({name: 'note', type, enableXssProtection: true}).parseVal(val);

            [parse('string', markup), parse('auto', markup), parse('tags', [markup])[0]].forEach(
                val => {
                    expect(val).toContain('<b>Hi</b>');
                    expect(val).not.toMatch(/onerror|<script/);
                }
            );
        });

        it('leaves markup untouched by default', () => {
            const field = new Field({name: 'note', type: 'string'});
            expect(field.parseVal(markup)).toBe(markup);
        });
    });
});

describe('genDisplayName', () => {
    it.each([
        ['myField', 'My Field'],
        ['id', 'ID'],
        ['foo_id', 'Foo ID'],
        ['userId', 'User ID'],
        ['identity', 'Identity']
    ])('generates %j -> %j', (name, expected) => {
        expect(genDisplayName(name)).toBe(expected);
    });
});
