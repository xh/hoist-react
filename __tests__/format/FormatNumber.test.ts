// Stub out cmp/layout to prevent the @xh/hoist/core → XH cascade.
jest.mock('@xh/hoist/cmp/layout', () => ({
    span: (spec: any) => spec
}));

import {parseNumber} from '@xh/hoist/format/FormatNumber';

describe('parseNumber', () => {
    it('returns null for null and empty string', () => {
        expect(parseNumber(null)).toBeNull();
        expect(parseNumber(undefined)).toBeNull();
        expect(parseNumber('')).toBeNull();
    });

    it('parses plain numeric strings', () => {
        expect(parseNumber('42')).toBe(42);
        expect(parseNumber('3.14')).toBe(3.14);
        expect(parseNumber('-10')).toBe(-10);
    });

    it('passes through numeric values', () => {
        expect(parseNumber(42)).toBe(42);
        expect(parseNumber(0)).toBe(0);
    });

    it('strips comma separators before parsing', () => {
        expect(parseNumber('1,000')).toBe(1000);
        expect(parseNumber('1,234,567')).toBe(1234567);
    });

    it('expands k (thousands) shorthand', () => {
        expect(parseNumber('1k')).toBe(1000);
        expect(parseNumber('1.5k')).toBe(1500);
        expect(parseNumber('100K')).toBe(100000); // case-insensitive
    });

    it('expands m (millions) shorthand', () => {
        expect(parseNumber('2m')).toBe(2000000);
        expect(parseNumber('1.5m')).toBe(1500000);
        expect(parseNumber('0.5M')).toBe(500000);
    });

    it('expands b (billions) shorthand', () => {
        expect(parseNumber('1b')).toBe(1000000000);
        expect(parseNumber('2.5b')).toBe(2500000000);
    });

    it('returns NaN for unparseable strings', () => {
        expect(parseNumber('abc')).toBeNaN();
    });

    it('falls through to parseFloat for partial numeric strings', () => {
        // '1x' has no valid shorthand — parseFloat('1x') returns 1
        expect(parseNumber('1x')).toBe(1);
    });
});
