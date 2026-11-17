/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {scrollIntoViewWithin} from '@xh/hoist/utils/js';
import {describe, expect, it, vi} from 'vitest';

/**
 * DOM helpers. `scrollIntoViewWithin` scrolls only the container it is given, so a tab switcher can
 * show its active tab without moving a scrolling panel or page around it.
 */
describe('DomUtils', () => {
    describe('scrollIntoViewWithin', () => {
        // The container's visible area spans 0-100 on both axes. jsdom has no layout, so the
        // element and container positions are mocked.
        it.each([
            ['cut off at the end', [80, 130], {left: 30, top: 0}],
            ['cut off at the start', [-20, 30], {left: -20, top: 0}],
            ['larger than the container, by showing its start', [20, 150], {left: 20, top: 0}],
            ['cut off on both axes', [80, 130, 90, 120], {left: 30, top: 20}]
        ])('scrolls just far enough to show an element %s', (_, pos, expected) => {
            const container = scrollIntoView(pos);
            expect(container.scrollBy).toHaveBeenCalledWith({...expected, behavior: 'auto'});
        });

        it('leaves the container alone when the element is already in view', () => {
            const container = scrollIntoView([20, 70]);
            expect(container.scrollBy).not.toHaveBeenCalled();
        });
    });
});

/**
 * Run `scrollIntoViewWithin` on an element at `[left, right, top?, bottom?]` in a container
 * spanning 0-100 on both axes. The element defaults to 0-20 vertically. Returns the container.
 */
function scrollIntoView([left, right, top = 0, bottom = 20]: number[]): HTMLElement {
    const elem = document.createElement('div'),
        container = document.createElement('div');
    vi.spyOn(elem, 'getBoundingClientRect').mockReturnValue({left, right, top, bottom} as DOMRect);
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 100,
        top: 0,
        bottom: 100
    } as DOMRect);
    container.scrollBy = vi.fn();
    scrollIntoViewWithin(elem, container);
    return container;
}
