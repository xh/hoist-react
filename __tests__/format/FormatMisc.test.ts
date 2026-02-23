// Stub out the cmp/layout module to prevent the @xh/hoist/core → XH cascade.
jest.mock('@xh/hoist/cmp/layout', () => ({
    span: (spec: any) => spec
}));

import {capitalizeWords, fmtJson} from '@xh/hoist/format/FormatMisc';

describe('capitalizeWords', () => {
    it('capitalizes the first letter of each word', () => {
        expect(capitalizeWords('hello world')).toBe('Hello World');
        expect(capitalizeWords('foo bar baz')).toBe('Foo Bar Baz');
    });

    it('lowercases the remainder of each word', () => {
        expect(capitalizeWords('HELLO WORLD')).toBe('Hello World');
        expect(capitalizeWords('hELLO wORLD')).toBe('Hello World');
    });

    it('handles a single word', () => {
        expect(capitalizeWords('hello')).toBe('Hello');
    });

    it('returns null and empty string as-is', () => {
        expect(capitalizeWords(null)).toBeNull();
        expect(capitalizeWords('')).toBe('');
    });
});

describe('fmtJson', () => {
    it('pretty-prints a plain object with default indentation', () => {
        expect(fmtJson({a: 1})).toBe('{\n  "a": 1\n}');
    });

    it('accepts a pre-serialized JSON string and reformats it', () => {
        expect(fmtJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    });

    it('returns empty string for null input', () => {
        expect(fmtJson(null)).toBe('');
    });

    it('respects a custom space option', () => {
        expect(fmtJson({a: 1}, {space: 4})).toBe('{\n    "a": 1\n}');
    });

    it('applies a replacer function', () => {
        const replacer = (_key: string, value: any) =>
            typeof value === 'number' ? value * 2 : value;
        expect(fmtJson({a: 2}, {replacer})).toBe('{\n  "a": 4\n}');
    });
});
