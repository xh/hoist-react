/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {statCard, statCardStrip} from '@xh/hoist/cmp/statcard';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * StatCard truncates its secondary lines, so a tooltip on a truncated line is how users read its
 * full text. A clickable card must work from the keyboard as well as the mouse. StatCardStrip
 * takes cards that apps leave out with `omit`.
 */
describe('StatCard', () => {
    beforeAll(() => initTestAppAsync());

    it('gives a truncated line a tooltip with its full text, including element content', () => {
        const {container} = render(
            statCard({title: 'Capacity', value: 1, detail: span('Across ', span('42 sites'))})
        );
        const detail = line(container, 'detail');

        setOverflow(detail, true);
        fireEvent.mouseEnter(detail);
        expect(detail.getAttribute('title')).toBe('Across 42 sites');

        setOverflow(detail, false);
        fireEvent.mouseEnter(detail);
        expect(detail.hasAttribute('title')).toBe(false);
    });

    it('omits the sub-value, info icon and detail unless given', () => {
        const {container} = render(statCard({title: 'Orders', value: 18375}));

        expect(line(container, 'sub-value')).toBeNull();
        expect(line(container, 'info')).toBeNull();
        expect(line(container, 'detail')).toBeNull();
    });

    it('applies intent and accent to the card, alongside layout props', () => {
        const {container} = render(
            statCard({title: 'Europe', value: 1, intent: 'danger', accent: 'red', width: 200})
        );
        const card = container.querySelector<HTMLElement>('.xh-stat-card');

        expect(card.classList).toContain('xh-stat-card--intent-danger');
        expect(card.classList).toContain('xh-stat-card--accented');
        expect(card.style.getPropertyValue('--xh-stat-card-accent-color')).toBe('red');
        expect(card.style.width).toBe('200px');
    });

    it('is a group labelled by its title when not clickable', () => {
        const {container} = render(statCard({title: 'Orders', value: 1}));
        const card = container.querySelector('.xh-stat-card');

        expect(card.getAttribute('role')).toBe('group');
        expect(card.getAttribute('aria-labelledby')).toBe(line(container, 'title').id);
    });

    it('calls onClick on a click, Enter or Space, as a focusable button', () => {
        const onClick = vi.fn(),
            {container} = render(statCard({title: 'Orders', value: 1, onClick}));
        const card = container.querySelector('.xh-stat-card');

        expect(card.getAttribute('role')).toBe('button');
        expect(card.getAttribute('tabindex')).toBe('0');

        fireEvent.click(card);
        fireEvent.keyDown(card, {key: 'Enter'});
        fireEvent.keyDown(card, {key: ' '});
        fireEvent.keyDown(card, {key: 'a'});
        expect(onClick).toHaveBeenCalledTimes(3);
    });
});

describe('StatCardStrip', () => {
    beforeAll(() => initTestAppAsync());

    it('renders each card not omitted', () => {
        const {container} = render(
            statCardStrip(
                statCard({title: 'A', value: 1}),
                statCard({title: 'B', value: 2, omit: true}),
                statCard({title: 'C', value: 3})
            )
        );

        expect(container.querySelectorAll('.xh-stat-card')).toHaveLength(2);
    });

    it('renders nothing when given no cards, or only omitted ones', () => {
        expect(render(statCardStrip()).container.innerHTML).toBe('');
        expect(
            render(statCardStrip(statCard({title: 'A', value: 1, omit: true}))).container.innerHTML
        ).toBe('');
    });

    it("lets a card's flex override its equal share", () => {
        const {container} = render(statCardStrip(statCard({title: 'A', value: 1, flex: 2})));

        expect(container.querySelector<HTMLElement>('.xh-stat-card').style.flex).toMatch(/^2/);
    });
});

function line(container: HTMLElement, name: string): HTMLElement {
    return container.querySelector(`.xh-stat-card__${name}`);
}

/** jsdom has no layout, so stand in for a line whose text does or does not overflow. */
function setOverflow(el: HTMLElement, overflows: boolean) {
    Object.defineProperty(el, 'clientWidth', {configurable: true, value: 100});
    Object.defineProperty(el, 'scrollWidth', {configurable: true, value: overflows ? 150 : 100});
}
