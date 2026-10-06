/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {forEachAsync} from '@xh/hoist/utils/async';
import {range} from 'lodash';
import {beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * forEachAsync keeps long synchronous loops - Cube view updates, grid column autosizing - from
 * freezing the browser, by pausing to let other tasks run as the loop goes. A skipped or repeated
 * item would silently corrupt the results, so these tests pin that every item is visited exactly
 * once across pauses, and that the loop pauses only while the page is visible.
 */
describe('forEachAsync', () => {
    beforeEach(() => {
        // Fake only the clock, so each item can "take" time while the loop's pauses stay real.
        vi.useFakeTimers({toFake: ['Date']});
    });

    /** Spend `ms` of clock time, as an expensive loop body would. */
    const spendTime = (ms: number) => vi.setSystemTime(Date.now() + ms);

    it.each([
        ['an array', ['a', 'b', 'c', 'd', 'e']],
        ['a set', new Set(['a', 'b', 'c', 'd', 'e'])]
    ])('visits each item of %s once, in order, across pauses', async (_, collection) => {
        vi.spyOn(XH, 'pageIsVisible', 'get').mockReturnValue(true);
        const visits = [];

        await forEachAsync(
            collection,
            (val, idx, coll) => {
                visits.push([val, idx, coll]);
                spendTime(30);
            },
            {waitAfter: 50}
        );

        expect(visits).toEqual(['a', 'b', 'c', 'd', 'e'].map((v, idx) => [v, idx, collection]));
    });

    it('lets other tasks run during the loop while the page is visible', async () => {
        vi.spyOn(XH, 'pageIsVisible', 'get').mockReturnValue(true);
        let otherTaskRan = false;
        setTimeout(() => (otherTaskRan = true), 0);

        const seenByItem: boolean[] = [];
        await forEachAsync(
            range(10),
            () => {
                seenByItem.push(otherTaskRan);
                spendTime(30);
            },
            {waitAfter: 50}
        );

        expect(seenByItem[0]).toBe(false);
        expect(seenByItem.at(-1)).toBe(true);
    });

    it('runs without pausing while the page is hidden', async () => {
        // A hidden tab gains nothing from pauses, and the browser throttles them into long stalls.
        vi.spyOn(XH, 'pageIsVisible', 'get').mockReturnValue(false);
        let otherTaskRan = false;
        setTimeout(() => (otherTaskRan = true), 0);

        const seenByItem: boolean[] = [];
        await forEachAsync(
            range(10),
            () => {
                seenByItem.push(otherTaskRan);
                spendTime(30);
            },
            {waitAfter: 50}
        );

        expect(seenByItem).toHaveLength(10);
        expect(seenByItem).not.toContain(true);
    });
});
