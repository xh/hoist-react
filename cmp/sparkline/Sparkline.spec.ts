/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {sparkline} from '@xh/hoist/cmp/sparkline';
import type {SparklineProps} from '@xh/hoist/cmp/sparkline';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * A Sparkline has no text, so its accessible name is all a screen reader gets. It must also draw
 * any series an app has without an error, as one bad cell would otherwise break a whole grid.
 */
describe('Sparkline', () => {
    beforeAll(() => initTestAppAsync());

    it('is an image named by a summary of its series', () => {
        const root = renderRoot({values: [101, 105, 118]});

        expect(root.getAttribute('role')).toBe('img');
        expect(root.getAttribute('aria-label')).toBe('Trend: 3 points, from 101 to 118');
        expect(root.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    });

    it('takes its name from a given label, and shows a tooltip only when asked', () => {
        const plain = renderRoot({values: [1, 2], label: 'Orders, last 30 days'});
        expect(plain.getAttribute('aria-label')).toBe('Orders, last 30 days');
        expect(plain.hasAttribute('title')).toBe(false);

        const withLabel = renderRoot({values: [1, 2], label: 'Orders', tooltip: true});
        expect(withLabel.getAttribute('title')).toBe('Orders');

        const withText = renderRoot({values: [1, 2], label: 'Orders', tooltip: 'Up 4%'});
        expect(withText.getAttribute('title')).toBe('Up 4%');
    });

    it('draws a line by default, with a stroke that does not scale with the box', () => {
        const root = renderRoot({values: [0, 5, 10]}),
            line = part(root, 'line');

        expect(line.getAttribute('d')).toBe('M0 100L50 50L100 0');
        expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke');
        expect(root.querySelector('svg').getAttribute('preserveAspectRatio')).toBe('none');
        expect(part(root, 'area')).toBeNull();
        expect(part(root, 'dot')).toBeNull();
    });

    it('adds a fill for an area', () => {
        const root = renderRoot({values: [0, 10], type: 'area'});

        expect(part(root, 'area')).not.toBeNull();
        expect(part(root, 'line')).not.toBeNull();
    });

    it('draws bars, and colors those below zero only when asked', () => {
        const plain = renderRoot({values: [10, -10], type: 'bar'});
        expect(part(plain, 'bars').getAttribute('d')).toBe('M5 0h40v50h-40ZM55 50h40v50h-40Z');
        expect(part(plain, 'bars--negative')).toBeNull();
        expect(part(plain, 'line')).toBeNull();

        const colored = renderRoot({values: [10, -10], type: 'bar', colorNegative: true});
        expect(part(colored, 'bars--negative').getAttribute('d')).toBe('M55 50h40v50h-40Z');
    });

    it.each([
        ['an empty series', []],
        ['a missing series', null],
        ['a series of gaps', [null, NaN, undefined]]
    ])('renders an empty box for %s', (name, values) => {
        const root = renderRoot({values});

        expect(root.getAttribute('aria-label')).toBe('Trend: no data');
        expect(root.querySelectorAll('path')).toHaveLength(0);
        expect(part(root, 'dot')).toBeNull();
    });

    it('shows a lone value as a centered dot', () => {
        const root = renderRoot({values: [null, 42, null]}),
            dot = part(root, 'dot');

        expect(part(root, 'line')).toBeNull();
        expect(dot.style.left).toBe('50%');
        expect(dot.style.top).toBe('50%');
    });

    it('marks the last, lowest and highest values with dots placed by percentage', () => {
        const root = renderRoot({values: [5, 0, 10, 5, null], showLast: true, showMinMax: true}),
            position = (name: string) => {
                const {left, top} = part(root, `dot--${name}`).style;
                return [left, top];
            };

        expect(position('min')).toEqual(['25%', '100%']);
        expect(position('max')).toEqual(['50%', '0%']);
        expect(position('last')).toEqual(['75%', '50%']);
    });

    it('marks no lowest or highest value on a flat series', () => {
        const root = renderRoot({values: [4, 4, 4], showMinMax: true});

        expect(part(root, 'line').getAttribute('d')).toBe('M0 50L50 50L100 50');
        expect(part(root, 'dot')).toBeNull();
    });

    it('draws a baseline, and extends the scale to take it in', () => {
        const root = renderRoot({values: [5, 10], baseline: 0});

        expect(part(root, 'baseline').getAttribute('d')).toBe('M0 100h100');
        expect(part(root, 'line').getAttribute('d')).toBe('M0 50L100 0');
    });

    it('leaves out a baseline that is off a fixed scale', () => {
        const root = renderRoot({values: [5, 10], baseline: 0, min: 5, max: 10});

        expect(part(root, 'baseline')).toBeNull();
    });

    it('draws on a fixed scale, so that sparklines can share one', () => {
        const root = renderRoot({values: [25, 50], min: 0, max: 100});

        expect(part(root, 'line').getAttribute('d')).toBe('M0 75L100 50');
    });

    it('colors by intent, or by trend when asked', () => {
        const classes = (props: Partial<SparklineProps>, values = [1, 2]) =>
            renderRoot({values, ...props}).className;

        expect(classes({})).not.toMatch(/--intent|--trend/);
        expect(classes({intent: 'warning'})).toContain('xh-sparkline--intent-warning');
        expect(classes({colorByTrend: true})).toContain('xh-sparkline--trend-up');
        expect(classes({colorByTrend: true}, [2, null, 1])).toContain('xh-sparkline--trend-down');
        expect(classes({colorByTrend: true}, [2, 9, 2])).not.toMatch(/--trend/);
        expect(classes({colorByTrend: true, intent: 'primary'})).not.toMatch(/--trend/);
    });

    it('applies layout props, a class name and a test id to its root', () => {
        const root = renderRoot({
            values: [1, 2],
            width: '100%',
            height: 40,
            className: 'my-trend',
            testId: 'trend'
        });

        expect(root.style.width).toBe('100%');
        expect(root.style.height).toBe('40px');
        expect(root.classList).toContain('my-trend');
        expect(root.getAttribute('data-testid')).toBe('trend');
    });
});

function renderRoot(props: SparklineProps): HTMLElement {
    return render(sparkline(props)).container.querySelector('.xh-sparkline');
}

/** The first element of a part, by the suffix of its class name. */
function part(root: HTMLElement, name: string): HTMLElement {
    return root.querySelector(`.xh-sparkline__${name}`);
}
