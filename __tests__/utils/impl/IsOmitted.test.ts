import {isOmitted} from '@xh/hoist/utils/impl/IsOmitted';

describe('isOmitted', () => {
    it('returns false for undefined input', () => {
        expect(isOmitted(undefined)).toBe(false);
    });

    it('returns false when omit is absent', () => {
        expect(isOmitted({})).toBe(false);
    });

    it('returns true when omit is true', () => {
        expect(isOmitted({omit: true})).toBe(true);
    });

    it('returns false when omit is false', () => {
        expect(isOmitted({omit: false})).toBe(false);
    });

    it('executes omit when it is a function and returns its result', () => {
        expect(isOmitted({omit: () => true})).toBe(true);
        expect(isOmitted({omit: () => false})).toBe(false);
    });

    it('coerces non-boolean omit values to boolean', () => {
        expect(isOmitted({omit: 1 as any})).toBe(true);
        expect(isOmitted({omit: '' as any})).toBe(false);
    });
});
