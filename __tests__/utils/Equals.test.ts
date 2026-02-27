import {shallowEqualArrays} from '@xh/hoist/utils/impl/Equals';

describe('shallowEqualArrays', () => {
    it('returns true for identical references', () => {
        const arr = [1, 2, 3];
        expect(shallowEqualArrays(arr, arr)).toBe(true);
    });

    it('returns true for arrays with equal elements', () => {
        expect(shallowEqualArrays([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('returns false for arrays with different lengths', () => {
        expect(shallowEqualArrays([1, 2], [1, 2, 3])).toBe(false);
    });

    it('returns false for arrays with different elements', () => {
        expect(shallowEqualArrays([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('handles null/undefined gracefully', () => {
        expect(shallowEqualArrays(null, null)).toBe(true);
        expect(shallowEqualArrays(null, [1])).toBe(false);
        expect(shallowEqualArrays([1], null)).toBe(false);
    });
});
