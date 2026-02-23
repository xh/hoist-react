// LocalDate is used in `dateIs` for instanceof checks, but all test inputs are native Dates.
// Mock the module to avoid the cascade through @xh/hoist/core (XH singleton).
jest.mock('@xh/hoist/utils/datetime', () => {
    class LocalDate {}
    return {LocalDate};
});

import {
    constrainAll,
    isValidJson,
    lengthIs,
    numberIs,
    required,
    stringExcludes,
    validEmail,
    validEmails
} from '@xh/hoist/data/validation/constraints';

// Helper — call a constraint and return its result.
function run(constraint: Function, value: any, displayName = 'Field') {
    return constraint({value, displayName});
}

describe('required', () => {
    it('passes for non-empty values', () => {
        expect(run(required, 'hello')).toBeUndefined();
        expect(run(required, 0)).toBeUndefined();
        expect(run(required, false)).toBeUndefined();
        expect(run(required, [1, 2])).toBeUndefined();
    });

    it('fails for null and undefined', () => {
        expect(run(required, null)).toMatch(/required/i);
        expect(run(required, undefined)).toMatch(/required/i);
    });

    it('fails for empty and whitespace-only strings', () => {
        expect(run(required, '')).toMatch(/required/i);
        expect(run(required, '   ')).toMatch(/required/i);
    });

    it('fails for empty arrays', () => {
        expect(run(required, [])).toMatch(/required/i);
    });

    it('includes the display name in the error message', () => {
        expect(run(required, null, 'Username')).toContain('Username');
    });
});

describe('validEmail', () => {
    it('passes for valid email addresses', () => {
        expect(run(validEmail, 'user@example.com')).toBeUndefined();
        expect(run(validEmail, 'user.name+tag@sub.domain.org')).toBeUndefined();
    });

    it('fails for invalid email addresses', () => {
        expect(run(validEmail, 'not-an-email')).toBeTruthy();
        expect(run(validEmail, '@nodomain.com')).toBeTruthy();
        expect(run(validEmail, 'missing@')).toBeTruthy();
    });

    it('passes for null (no value provided)', () => {
        expect(run(validEmail, null)).toBeNull();
    });
});

describe('validEmails', () => {
    const validate = validEmails();

    it('passes for a valid semicolon-separated list', () => {
        expect(run(validate, 'a@x.com;b@y.com')).toBeUndefined();
    });

    it('passes for a single valid email', () => {
        expect(run(validate, 'a@x.com')).toBeUndefined();
    });

    it('fails when duplicate emails are present', () => {
        expect(run(validate, 'a@x.com;a@x.com')).toMatch(/duplicate/i);
    });

    it('fails when count is below minCount', () => {
        const v = validEmails({minCount: 2});
        expect(run(v, 'a@x.com')).toMatch(/at least 2/i);
    });

    it('fails when count exceeds maxCount', () => {
        const v = validEmails({maxCount: 1});
        expect(run(v, 'a@x.com;b@y.com')).toMatch(/no more than 1/i);
    });

    it('fails when any email in the list is invalid', () => {
        expect(run(validate, 'a@x.com;not-valid')).toBeTruthy();
    });
});

describe('lengthIs', () => {
    it('passes when length is within range', () => {
        expect(run(lengthIs({min: 2, max: 5}), 'abc')).toBeUndefined();
        expect(run(lengthIs({min: 2, max: 5}), 'ab')).toBeUndefined(); // at min
        expect(run(lengthIs({min: 2, max: 5}), 'abcde')).toBeUndefined(); // at max
    });

    it('fails when string is shorter than min', () => {
        expect(run(lengthIs({min: 3}), 'ab')).toMatch(/at least 3/i);
    });

    it('fails when string exceeds max', () => {
        expect(run(lengthIs({max: 3}), 'abcd')).toMatch(/no more than 3/i);
    });

    it('passes for null value', () => {
        expect(run(lengthIs({min: 1}), null)).toBeNull();
    });
});

describe('numberIs', () => {
    it('passes when value is within range', () => {
        expect(run(numberIs({min: 0, max: 100}), 50)).toBeUndefined();
        expect(run(numberIs({min: 0, max: 100}), 0)).toBeUndefined(); // at min
        expect(run(numberIs({min: 0, max: 100}), 100)).toBeUndefined(); // at max
    });

    it('fails when value is below min', () => {
        expect(run(numberIs({min: 10}), 5)).toMatch(/greater than or equal to 10/i);
    });

    it('fails when value exceeds max', () => {
        expect(run(numberIs({max: 10}), 15)).toMatch(/less than or equal to 10/i);
    });

    it('supports exclusive gt/lt constraints', () => {
        expect(run(numberIs({gt: 5}), 5)).toMatch(/greater than 5/i);
        expect(run(numberIs({gt: 5}), 6)).toBeUndefined();
        expect(run(numberIs({lt: 10}), 10)).toMatch(/less than 10/i);
        expect(run(numberIs({lt: 10}), 9)).toBeUndefined();
    });

    it('fails for zero when notZero is set', () => {
        expect(run(numberIs({notZero: true}), 0)).toMatch(/must not be zero/i);
        expect(run(numberIs({notZero: true}), 1)).toBeUndefined();
    });

    it('passes for null value', () => {
        expect(run(numberIs({min: 0}), null)).toBeNull();
    });
});

describe('stringExcludes', () => {
    it('passes when string does not contain excluded values', () => {
        expect(run(stringExcludes('<', '>'), 'hello world')).toBeUndefined();
    });

    it('fails when string contains an excluded value', () => {
        expect(run(stringExcludes('<', '>'), 'hello <world>')).toMatch(/"<"/);
    });

    it('passes for null value', () => {
        expect(run(stringExcludes('x'), null)).toBeNull();
    });
});

describe('isValidJson', () => {
    it('passes for valid JSON strings', () => {
        expect(run(isValidJson, '{"a":1}')).toBeUndefined();
        expect(run(isValidJson, '[1,2,3]')).toBeUndefined();
        expect(run(isValidJson, '"hello"')).toBeUndefined();
    });

    it('fails for invalid JSON', () => {
        expect(run(isValidJson, '{a:1}')).toMatch(/not valid JSON/i);
        expect(run(isValidJson, 'not json')).toMatch(/not valid JSON/i);
    });
});

describe('constrainAll', () => {
    it('passes when all items in the array satisfy the constraint', () => {
        expect(run(constrainAll(required), ['a', 'b', 'c'])).toBeNull();
    });

    it('returns the first failure message when an item fails', () => {
        const result = run(constrainAll(required), ['a', null, 'c']);
        expect(result).toMatch(/required/i);
    });

    it('passes for null or empty array', () => {
        expect(run(constrainAll(required), null)).toBeNull();
        expect(run(constrainAll(required), [])).toBeNull();
    });
});
