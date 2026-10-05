/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    FieldFilter,
    parseFilter,
    type FieldFilterOperator,
    type FieldFilterSpec,
    type Filter
} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * What each FieldFilter operator matches, tested on plain objects, plus filter equality and JSON
 * persistence. FieldFilter is the predicate behind every Store filter, grid column filter,
 * FilterChooser and Cube query - a change in what an operator matches changes the rows users see.
 * Store-aware behavior is covered in FieldFilterStore.spec.ts.
 */
describe('FieldFilter', () => {
    describe('= and !=', () => {
        it('match any of an array of values', () => {
            const values = ['active', 'pending', 'closed', null];
            expect(passing('=', ['active', 'pending'], values)).toEqual(['active', 'pending']);
            expect(passing('!=', ['active', 'pending'], values)).toEqual(['closed', null]);
        });

        // v86.1.0 (d96137190) - empty tags arrays did not match "Is blank" grid filters.
        it('treat null, undefined, empty string and empty array alike as blank', () => {
            const values = [null, undefined, '', [], 'x', 0, false],
                blanks = [null, undefined, '', []];
            expect(passing('=', null, values)).toEqual(blanks);
            expect(passing('!=', null, values)).toEqual(['x', 0, false]);

            // An empty value list is also a blank filter.
            expect(passing('=', [], values)).toEqual(blanks);
            expect(passing('!=', [], values)).toEqual(['x', 0, false]);
        });

        it('match blank values when the value list includes null', () => {
            // A grid column's Values filter sends its "[blank]" entry as null.
            const values = ['a', 'b', null, ''];
            expect(passing('=', ['a', null], values)).toEqual(['a', null, '']);
            expect(passing('!=', ['a', null], values)).toEqual(['b']);
        });

        // v59.4.0 (#3531) switched to isEqual - the v87 Set-based lookups (c26e2d6da) must keep it.
        it('compare Dates by value rather than identity', () => {
            const noon = new Date(2023, 4, 31, 12),
                values = [new Date(noon.getTime()), new Date(2023, 5, 1), 'x', null];

            expect(passing('=', new Date(noon.getTime()), values)).toEqual([values[0]]);
            expect(passing('!=', new Date(noon.getTime()), values)).toEqual(values.slice(1));
            expect(passing('=', [new Date(noon.getTime()), 'x'], values)).toEqual([values[0], 'x']);
        });
    });

    describe('range operators', () => {
        // v36.0.0 (#2051) - Excel semantics, where JS would compare null as 0.
        it('never match null or undefined', () => {
            expect(passing('>=', 0, [null, undefined, -1, 0, 1])).toEqual([0, 1]);
            expect(passing('<', 1, [null, undefined, 0])).toEqual([0]);
        });

        it('compare LocalDates in calendar order', () => {
            const days = ['2023-12-31', '2024-01-01', '2024-01-02'].map(d => LocalDate.get(d));
            expect(passing('>', days[1], days)).toEqual([days[2]]);
            expect(passing('<=', days[1], days)).toEqual([days[0], days[1]]);
        });
    });

    describe('text operators', () => {
        it('match case-insensitively, treating the value as literal text', () => {
            expect(passing('like', 'a.c', ['XA.CX', 'abc'])).toEqual(['XA.CX']);
            expect(passing('begins', '(', ['(draft)', 'draft'])).toEqual(['(draft)']);
        });

        it('anchor begins and ends to the start and end of the value', () => {
            const values = ['abc', 'cab'];
            expect(passing('begins', 'ab', values)).toEqual(['abc']);
            expect(passing('not begins', 'ab', values)).toEqual(['cab']);
            expect(passing('ends', 'ab', values)).toEqual(['cab']);
            expect(passing('not ends', 'ab', values)).toEqual(['abc']);
        });

        it('match any of an array of values, or none of them when negated', () => {
            const values = ['Smith', 'Jones', 'Brown'];
            expect(passing('like', ['smith', 'jones'], values)).toEqual(['Smith', 'Jones']);
            expect(passing('not like', ['smith', 'jones'], values)).toEqual(['Brown']);
        });

        // BUG: FieldFilter.ts:227-249 - the regex tests coerce a null or undefined value to the
        // text "null" or "undefined", so blank rows match terms such as 'l', 'nu' or 'ed'.
        it.fails('do not treat blank values as the text "null" or "undefined"', () => {
            expect(passing('like', 'l', [null, 'Bill'])).toEqual(['Bill']);
            expect(passing('begins', 'nu', [null, 'Nuno'])).toEqual(['Nuno']);
            expect(passing('ends', 'ed', [undefined, 'Closed'])).toEqual(['Closed']);

            // A blank value does not contain 'u', so it passes - as blanks do for != and excludes.
            expect(passing('not like', 'u', [null, 'Bill'])).toEqual([null, 'Bill']);
        });
    });

    describe('includes and excludes', () => {
        it('test array values for any shared element', () => {
            const values = [['a'], ['b', 'c'], ['c'], [], null];
            expect(passing('includes', ['a', 'b'], values)).toEqual([['a'], ['b', 'c']]);
            expect(passing('excludes', ['a', 'b'], values)).toEqual([['c'], [], null]);
        });
    });

    describe('constructor', () => {
        // These would otherwise fail later, or silently match nothing.
        it.each([
            ['no field', {field: null, op: '=', value: 'x'}],
            ['an undefined value', {field: 'f', op: '=', value: undefined}],
            ['an unknown operator', {field: 'f', op: 'contains', value: 'x'}],
            ['an array value for a range operator', {field: 'f', op: '>', value: [1, 2]}]
        ])('rejects a spec with %s', (_, spec) => {
            expect(() => new FieldFilter(spec as any)).toThrow();
        });
    });

    describe('equals', () => {
        it('compares field, op and value, ignoring the order of array values', () => {
            const filter = parseFilter({field: 'f', op: '=', value: ['a', 'b']}),
                equalsSpec = (spec: FieldFilterSpec) => filter.equals(parseFilter(spec));

            expect(equalsSpec({field: 'f', op: '=', value: ['b', 'a']})).toBe(true);
            expect(equalsSpec({field: 'f', op: '=', value: ['a']})).toBe(false);
            expect(equalsSpec({field: 'f', op: '!=', value: ['a', 'b']})).toBe(false);
            expect(equalsSpec({field: 'g', op: '=', value: ['a', 'b']})).toBe(false);
        });
    });

    describe('toJSON', () => {
        // Restoring a typed value parses it with the app's field defaults, which needs XH.appSpec.
        beforeAll(() => initTestAppAsync());

        // FilterChooser persists filters this way, and finds saved favorites with equals().
        it.each([
            ['an array', ['a', 'b']],
            ['a LocalDate', LocalDate.get('2023-05-31')],
            ['an array of LocalDates', [LocalDate.get('2023-05-31'), LocalDate.get('2023-06-01')]]
        ])('restores a filter on %s to an equal filter', (_, value) => {
            const filter = parseFilter({field: 'f', op: '=', value});
            expect(roundTrip(filter).equals(filter)).toBe(true);
        });

        // BUG: FieldFilter.ts:312 - equals() compares values with ===, so a restored Date, which is
        // a new instance, never equals the original. '=' itself compares Dates by value.
        it.fails('restores a filter on a Date to an equal filter', () => {
            const filter = parseFilter({field: 'f', op: '=', value: new Date(2023, 4, 31, 12)}),
                restored = roundTrip(filter) as FieldFilter;

            expect(restored.value).toEqual(new Date(2023, 4, 31, 12));
            expect(restored.equals(filter)).toBe(true);
        });
    });
});

//------------------
// Helpers
//------------------
/** The candidates that pass a filter on field `f`, each tested as the value of a plain object. */
function passing(op: FieldFilterOperator, value: any, candidates: any[]): any[] {
    const test = parseFilter({field: 'f', op, value}).getTestFn();
    return candidates.filter(f => test({f}));
}

/** A filter restored from its persisted JSON form. */
function roundTrip(filter: Filter): Filter {
    return parseFilter(JSON.parse(JSON.stringify(filter)));
}
