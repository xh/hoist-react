jest.mock('@xh/hoist/core', () => ({XH: {pageIsVisible: true}}));
// Provide a real timer-based wait so fake timers can control it.
jest.mock('@xh/hoist/promise', () => ({
    wait: (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms))
}));

import {forEachAsync, whileAsync} from '@xh/hoist/utils/async/AsyncUtils';
import {XH} from '@xh/hoist/core';

describe('forEachAsync', () => {
    afterEach(() => {
        (XH as any).pageIsVisible = true;
    });

    it('iterates all items in order', async () => {
        const result: number[] = [];
        await forEachAsync([1, 2, 3], v => result.push(v));
        expect(result).toEqual([1, 2, 3]);
    });

    it('provides the correct index to the callback', async () => {
        const indices: number[] = [];
        await forEachAsync([10, 20, 30], (_v, i) => indices.push(i));
        expect(indices).toEqual([0, 1, 2]);
    });

    it('handles an empty collection without calling fn', async () => {
        const fn = jest.fn();
        await forEachAsync([], fn);
        expect(fn).not.toHaveBeenCalled();
    });

    it('completes correctly when page is hidden (synchronous fast-path)', async () => {
        (XH as any).pageIsVisible = false;
        const result: number[] = [];
        await forEachAsync([1, 2, 3], v => result.push(v));
        expect(result).toEqual([1, 2, 3]);
    });

    it('works with any iterable (Set)', async () => {
        const result: number[] = [];
        await forEachAsync(new Set([4, 5, 6]), v => result.push(v));
        expect(result).toEqual([4, 5, 6]);
    });
});

describe('whileAsync', () => {
    afterEach(() => {
        (XH as any).pageIsVisible = true;
    });

    it('loops until the condition returns false', async () => {
        let count = 0;
        await whileAsync(
            () => count < 5,
            () => count++
        );
        expect(count).toBe(5);
    });

    it('never calls fn when the condition starts false', async () => {
        const fn = jest.fn();
        await whileAsync(() => false, fn);
        expect(fn).not.toHaveBeenCalled();
    });

    it('completes correctly when page is hidden (synchronous fast-path)', async () => {
        (XH as any).pageIsVisible = false;
        let count = 0;
        await whileAsync(
            () => count < 3,
            () => count++
        );
        expect(count).toBe(3);
    });
});
