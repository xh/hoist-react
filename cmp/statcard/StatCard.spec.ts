/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {statCard, statCardStrip} from '@xh/hoist/cmp/statcard';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * StatCard truncates every line, so the native tooltip on each line is how users read the full
 * text. StatCardStrip takes card lists that apps build from functions which may return null.
 */
describe('StatCard', () => {
    beforeAll(() => initTestAppAsync());

    it('gives string and number lines a tooltip with their full text', () => {
        const {container} = render(
            statCard({title: 'Net Revenue', value: 2483960, detail: 'All locations'})
        );

        expect(title(container, 'title')).toBe('Net Revenue');
        expect(title(container, 'value-primary')).toBe('2483960');
        expect(title(container, 'detail')).toBe('All locations');
    });

    it('gives element content no tooltip, as its text cannot be known', () => {
        const {container} = render(statCard({title: 'Capacity', value: span('82%')}));

        expect(container.querySelector('.xh-stat-card__value-primary').hasAttribute('title')).toBe(
            false
        );
    });

    it('omits the secondary label, info icon and detail unless given', () => {
        const {container} = render(statCard({title: 'Orders', value: 18375}));

        expect(container.querySelector('.xh-stat-card__secondary')).toBeNull();
        expect(container.querySelector('.xh-stat-card__info')).toBeNull();
        expect(container.querySelector('.xh-stat-card__detail')).toBeNull();
    });

    it('applies valueIntent as a class on the value line', () => {
        const {container} = render(
            statCard({title: 'Returns', value: '(87,412)', valueIntent: 'danger'})
        );

        expect(container.querySelector('.xh-stat-card__value--danger')).not.toBeNull();
    });

    it('applies accent as the top border color alongside layout props', () => {
        const {container} = render(
            statCard({title: 'Europe', value: 1, accent: 'red', width: 200})
        );
        const card = container.querySelector<HTMLElement>('.xh-stat-card');

        expect(card.classList).toContain('xh-stat-card--accented');
        expect(card.style.borderTopColor).toBe('red');
        expect(card.style.width).toBe('200px');
    });
});

describe('StatCardStrip', () => {
    beforeAll(() => initTestAppAsync());

    it('renders a card for each non-null entry', () => {
        const {container} = render(
            statCardStrip({cards: [{title: 'A', value: 1}, null, {title: 'B', value: 2}]})
        );

        expect(container.querySelectorAll('.xh-stat-card')).toHaveLength(2);
    });

    it('renders nothing for an empty, all-null or absent card list', () => {
        expect(render(statCardStrip({cards: []})).container.innerHTML).toBe('');
        expect(render(statCardStrip({cards: [null]})).container.innerHTML).toBe('');
        expect(render(statCardStrip({})).container.innerHTML).toBe('');
    });
});

function title(container: HTMLElement, line: string): string {
    return container.querySelector(`.xh-stat-card__${line}`).getAttribute('title');
}
