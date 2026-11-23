/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {sparkline} from '@xh/hoist/cmp/sparkline';
import type {SparklineProps} from '@xh/hoist/cmp/sparkline';
import * as desktopImpls from '@xh/hoist/dynamics/desktop';
import {installDesktopImpls} from '@xh/hoist/dynamics/desktop';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {createRef} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * A Sparkline has no text, so its accessible name is all a screen reader gets. Where shapes and
 * dots land is covered by `impl/SparklineGeometry.spec.ts` - this spec checks which parts draw.
 */
describe('Sparkline', () => {
    beforeAll(() => initTestAppAsync());

    it('is an image named by a summary of its series', () => {
        const root = renderRoot({data: [101, 105, 118]});

        expect(root.getAttribute('role')).toBe('img');
        expect(root.getAttribute('aria-label')).toBe('Trend: 3 points, from 101 to 118');
    });

    it('takes its name from an aria-label in domAttrs', () => {
        const root = renderRoot({data: [1, 2], domAttrs: {'aria-label': 'Orders, last 30 days'}});

        expect(root.getAttribute('aria-label')).toBe('Orders, last 30 days');
    });

    describe('tooltip', () => {
        it('adds nothing to the DOM and builds no content until hovered', () => {
            const tooltip = vi.fn(() => 'Up 4%'),
                plain = renderRoot({data: [1, 2]}),
                withTip = renderRoot({data: [1, 2], tooltip});

            expect(withTip.outerHTML).toBe(plain.outerHTML);
            expect(tooltip).not.toHaveBeenCalled();
        });

        it('shows nothing for an empty string', async () => {
            const root = renderRoot({data: [1, 2], tooltip: ''});

            fireEvent.mouseEnter(root);
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(document.querySelector('.xh-sparkline').className).not.toContain(
                'popover-target'
            );
        });

        it('shows on hover in a Blueprint tooltip on desktop, built from the data', async () => {
            const tooltip = vi.fn((data: number[]) =>
                    span({className: 'custom-tip', children: `${data.length} days`})
                ),
                root = renderRoot({data: [1, 2], tooltip});

            fireEvent.mouseEnter(root);
            expect((await screen.findByText('2 days')).className).toBe('custom-tip');
            expect(root.hasAttribute('title')).toBe(false);
            expect(tooltip).toHaveBeenCalledWith([1, 2]);
        });

        it('keeps the sparkline as the tooltip target, with its layout and ref', async () => {
            const ref = createRef<HTMLDivElement>(),
                {container} = render(
                    sparkline({data: [1, 2], tooltip: 'Up 4%', width: '100%', ref})
                );

            fireEvent.mouseEnter(container.querySelector('.xh-sparkline'));
            await screen.findByText('Up 4%');

            const root = container.querySelector<HTMLElement>('.xh-sparkline');
            expect(root.parentElement).toBe(container);
            expect(root.className).toContain('popover-target');
            expect(root.style.width).toBe('100%');
            expect(ref.current).toBe(root);
        });

        it('shows nothing when the function returns null', async () => {
            const tooltip = vi.fn(() => null),
                root = renderRoot({data: [1, 2], tooltip});

            fireEvent.mouseEnter(root);
            await vi.waitFor(() => expect(tooltip).toHaveBeenCalled());

            expect(document.querySelector('.xh-sparkline').className).not.toContain(
                'popover-target'
            );
        });

        it('shows no tooltip and builds no content without the desktop impl', () => {
            const installed = {...desktopImpls};
            installDesktopImpls({...installed, sparklineTooltipImpl: null});
            try {
                const tooltip = vi.fn(() => 'Up 4%'),
                    plain = renderRoot({data: [1, 2]}),
                    withTip = renderRoot({data: [1, 2], tooltip});

                fireEvent.mouseEnter(withTip);
                expect(withTip.outerHTML).toBe(plain.outerHTML);
                expect(tooltip).not.toHaveBeenCalled();
            } finally {
                installDesktopImpls(installed);
            }
        });
    });

    it('draws a line by default, with no fill and no dots', () => {
        const root = renderRoot({data: [0, 5, 10]});

        expect(part(root, 'line')).not.toBeNull();
        expect(part(root, 'area')).toBeNull();
        expect(part(root, 'dot')).toBeNull();
    });

    it('takes the default for a prop set to null', () => {
        const unset = renderRoot({data: [5, 10]}),
            nulls = renderRoot({
                data: [5, 10],
                type: null,
                intent: null,
                baseline: null,
                min: null,
                max: null,
                colorBy: null,
                markers: null,
                tooltip: null
            });

        expect(nulls.outerHTML).toBe(unset.outerHTML);
    });

    it.each([
        ['min', {min: null, max: 20}, {max: 20}],
        ['max', {min: 0, max: null}, {min: 0}],
        ['baseline', {baseline: null, type: 'bar' as const}, {type: 'bar' as const}]
    ])('takes the default for a null %s beside other props', (name, withNull, unset) => {
        expect(renderRoot({data: [5, 10], ...withNull}).outerHTML).toBe(
            renderRoot({data: [5, 10], ...unset}).outerHTML
        );
    });

    it('adds a fill for an area', () => {
        const root = renderRoot({data: [0, 10], type: 'area'});

        expect(part(root, 'area')).not.toBeNull();
        expect(part(root, 'line')).not.toBeNull();
    });

    it('draws bars, and colors those below zero only when asked', () => {
        const plain = renderRoot({data: [10, -10], type: 'bar'});
        expect(part(plain, 'bars')).not.toBeNull();
        expect(part(plain, 'bars--negative')).toBeNull();
        expect(part(plain, 'line')).toBeNull();

        const colored = renderRoot({data: [10, -10], type: 'bar', colorBy: 'sign'});
        expect(part(colored, 'bars--negative')).not.toBeNull();
    });

    it('colors the part of a line or area below zero only when asked', () => {
        const plain = renderRoot({data: [10, -10], type: 'area'});
        expect(part(plain, 'area--negative')).toBeNull();
        expect(part(plain, 'line--negative')).toBeNull();

        const colored = renderRoot({data: [10, -10], type: 'area', colorBy: 'sign'});
        expect(part(colored, 'area--negative')).not.toBeNull();
        expect(part(colored, 'line--negative')).not.toBeNull();
    });

    it('fills an area to its baseline, or to the bottom without one', () => {
        const floor = (props: Partial<SparklineProps>) =>
            part(renderRoot({data: [0, 10], type: 'area', ...props}), 'area')
                .getAttribute('d')
                .match(/^M[\d.]+ ([\d.]+)/)[1];

        expect(floor({})).toBe('100');
        expect(floor({baseline: 5})).toBe('50');
    });

    it.each([
        ['an empty series', []],
        ['a missing series', null],
        ['a series of gaps', [null, NaN, undefined]]
    ])('renders an empty box for %s', (name, data) => {
        const root = renderRoot({data});

        expect(root.getAttribute('aria-label')).toBe('Trend: no data');
        expect(root.querySelectorAll('path')).toHaveLength(0);
        expect(part(root, 'dot')).toBeNull();
    });

    it('shows a lone value as a dot', () => {
        const root = renderRoot({data: [null, 42, null]});

        expect(part(root, 'line')).toBeNull();
        expect(root.querySelectorAll('.xh-sparkline__dot')).toHaveLength(1);
    });

    it('marks only the values named in markers', () => {
        const marked = (markers: SparklineProps['markers']) =>
            Array.from(renderRoot({data: [5, 0, 10, 5], markers}).querySelectorAll('span')).map(
                it => it.className.replace('xh-sparkline__dot xh-sparkline__dot--', '')
            );

        expect(marked([])).toEqual([]);
        expect(marked(['last'])).toEqual(['last']);
        expect(marked(['first', 'last', 'min', 'max'])).toEqual(['first', 'min', 'max', 'last']);
    });

    it('marks no lowest or highest value on a flat series', () => {
        const root = renderRoot({data: [4, 4, 4], markers: ['min', 'max']});

        expect(part(root, 'dot')).toBeNull();
    });

    it('marks no values on bars', () => {
        const root = renderRoot({data: [5, 0, 10], type: 'bar', markers: ['last', 'max']});

        expect(part(root, 'dot')).toBeNull();
    });

    it('draws a baseline, unless it is off a fixed scale', () => {
        expect(part(renderRoot({data: [5, 10], baseline: 0}), 'baseline')).not.toBeNull();
        expect(
            part(renderRoot({data: [5, 10], baseline: 0, min: 5, max: 10}), 'baseline')
        ).toBeNull();
    });

    it('colors by intent by default, or by trend or sign when asked', () => {
        const classes = (props: Partial<SparklineProps>, data = [1, 2]) =>
            renderRoot({data, ...props}).className;

        expect(classes({})).not.toMatch(/--intent|--positive|--negative/);
        expect(classes({intent: 'warning'})).toContain('xh-sparkline--intent-warning');
        expect(classes({colorBy: 'intent', intent: 'warning'})).toContain('--intent-warning');
        expect(classes({colorBy: 'trend'})).toContain('xh-sparkline--positive');
        expect(classes({colorBy: 'trend'}, [2, null, 1])).toContain('xh-sparkline--negative');
        expect(classes({colorBy: 'trend'}, [2, 9, 2])).not.toMatch(/--positive|--negative/);
        expect(classes({colorBy: 'trend', intent: 'primary'}, [2, 1])).not.toMatch(/--intent/);
        expect(classes({colorBy: 'sign'}, [2, -1])).toContain('xh-sparkline--positive');
    });

    it('applies layout props, a class name and a test id to its root', () => {
        const root = renderRoot({
            data: [1, 2],
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
