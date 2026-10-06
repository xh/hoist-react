/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    type Constraint,
    constrainAll,
    dateIs,
    isValidJson,
    lengthIs,
    numberIs,
    required,
    stringExcludes,
    validEmail,
    validEmails
} from '@xh/hoist/data';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {describe, expect, it, vi} from 'vitest';

/**
 * Hoist's built-in validation constraints, shared by FormModel and Store validation. Their messages
 * are shown to end users, and their handling of empty values decides whether a field is optional.
 */

/** Run a constraint against a value, normalizing a pass to null. */
function check(constraint: Constraint, value: any): any {
    return constraint({value, name: 'f', displayName: 'Field'}, {}) ?? null;
}

describe('required', () => {
    // Each value is wrapped, as it.each would spread a bare array into arguments.
    it.each([[null], [undefined], [''], ['   '], [[]]])('fails %j', value => {
        expect(check(required, value)).toBe('Field is required.');
    });

    it.each([[0], [false], ['x'], [[1]]])('passes %j', value => {
        expect(check(required, value)).toBeNull();
    });
});

describe('validEmail', () => {
    it('passes a well-formed address, or no value', () => {
        expect(check(validEmail, 'jane.doe@example.com')).toBeNull();
        expect(check(validEmail, null)).toBeNull();
    });

    it.each(['jdoe', 'jdoe@example', 'j doe@example.com', 'a@b.com; c@d.com'])(
        'fails %j',
        value => {
            expect(check(validEmail, value)).toBe(
                'Field is not a properly formatted email address.'
            );
        }
    );

    // BUG: constraints.ts:35 short-circuits only on null - '' is reported as a malformed address.
    // Per data/README.md and the 87.0.0 isValidJson fix, empty values should defer to `required`.
    it.fails('passes an empty string, deferring to required', () => {
        expect(check(validEmail, '')).toBeNull();
    });
});

describe('validEmails', () => {
    it('passes semicolon-separated addresses, ignoring spaces and a trailing separator', () => {
        expect(check(validEmails(), 'a@b.com; c@d.com;')).toBeNull();
        expect(check(validEmails(), null)).toBeNull();
    });

    it('fails when any address is malformed', () => {
        expect(check(validEmails(), 'a@b.com; nope')).toBe(
            'Field has an improperly formatted email address.'
        );
    });

    it('fails on duplicate addresses', () => {
        expect(check(validEmails(), 'a@b.com; a@b.com')).toBe(
            'Field must not contain duplicate emails.'
        );
    });

    it('enforces minCount, including when there is no value', () => {
        const constraint = validEmails({minCount: 2});
        expect(check(constraint, 'a@b.com')).toBe('Field must contain at least 2 emails.');
        // Fixed in 3720f16f8, before release - a null value passed regardless of minCount.
        expect(check(constraint, null)).toBe('Field must contain at least 2 emails.');
    });

    it('enforces maxCount', () => {
        expect(check(validEmails({maxCount: 1}), 'a@b.com; c@d.com')).toBe(
            'Field must contain no more than 1 email.'
        );
    });
});

describe('lengthIs', () => {
    const constraint = lengthIs({min: 2, max: 4});

    it('passes lengths within the inclusive bounds, or no value', () => {
        expect(check(constraint, 'ab')).toBeNull();
        expect(check(constraint, 'abcd')).toBeNull();
        expect(check(constraint, null)).toBeNull();
    });

    it('fails lengths outside the bounds', () => {
        expect(check(constraint, 'a')).toBe('Field must contain at least 2 characters.');
        expect(check(constraint, 'abcde')).toBe('Field must contain no more than 4 characters.');
    });
});

describe('numberIs', () => {
    it.each([
        [{min: 0}, 0, null],
        [{min: 0}, -1, 'Field must be greater than or equal to 0.'],
        [{max: 10}, 10, null],
        [{max: 10}, 11, 'Field must be less than or equal to 10.'],
        [{gt: 0}, 0, 'Field must be greater than 0.'],
        [{lt: 10}, 10, 'Field must be less than 10.'],
        [{notZero: true}, 0, 'Field must not be zero.'],
        [{min: 0, notZero: true}, null, null]
    ])('with %j checks %j', (opts, value, expected) => {
        expect(check(numberIs(opts), value)).toBe(expected);
    });
});

describe('dateIs', () => {
    const at = (h: number, m: number = 0) => new Date(2026, 2, 15, h, m),
        today = LocalDate.get('2026-03-15');

    it('compares against the current day for "today"', () => {
        vi.useFakeTimers({now: at(12)});

        const notPast = dateIs({min: 'today'});
        expect(check(notPast, today)).toBeNull();
        expect(check(notPast, at(0, 1))).toBeNull();
        expect(check(notPast, today.previousDay())).toBe('Field must not be before today.');

        const notFuture = dateIs({max: 'today'});
        expect(check(notFuture, at(23, 59))).toBeNull();
        expect(check(notFuture, today.nextDay())).toBe('Field must not be after today.');
    });

    it('compares against the current instant for "now"', () => {
        vi.useFakeTimers({now: at(12)});

        expect(check(dateIs({min: 'now'}), at(11, 59))).toBe('Field must not be in the past.');
        expect(check(dateIs({max: 'now'}), at(12, 1))).toBe('Field must not be in the future.');
        expect(check(dateIs({min: 'now', max: 'now'}), at(12))).toBeNull();
    });

    it('formats an explicit bound in the message', () => {
        const constraint = dateIs({min: LocalDate.get('2026-01-01'), fmt: 'MM/DD/YYYY'});
        expect(check(constraint, LocalDate.get('2026-01-01'))).toBeNull();
        expect(check(constraint, new Date(2025, 11, 31))).toMatch(
            /^Field must not be before 01\/01\/2026/
        );
    });
});

describe('stringExcludes', () => {
    it('fails a value containing any excluded string, naming it', () => {
        const constraint = stringExcludes('/', '|');
        expect(check(constraint, 'a|b')).toBe('Field must not include "|"');
        expect(check(constraint, 'a-b')).toBeNull();
    });
});

describe('isValidJson', () => {
    // Fixed in 87.0.0 - blank values failed rather than deferring to `required`.
    it.each([null, '', '   ', '{"a":1}', '[1, 2]'])('passes %j', value => {
        expect(check(isValidJson, value)).toBeNull();
    });

    it('fails malformed JSON', () => {
        expect(check(isValidJson, '{a: 1}')).toBe('Field is not valid JSON');
    });
});

describe('constrainAll', () => {
    const constraint = constrainAll(validEmail);

    it('returns the first failure among the values', () => {
        expect(check(constraint, ['a@b.com', 'bad', 'worse'])).toBe(
            'Field is not a properly formatted email address.'
        );
    });

    it('passes when every value passes, or there are none', () => {
        expect(check(constraint, ['a@b.com', 'c@d.com'])).toBeNull();
        expect(check(constraint, [])).toBeNull();
        expect(check(constraint, null)).toBeNull();
    });
});
