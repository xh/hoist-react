/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {progressBar} from '@xh/hoist/cmp/progressbar';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * ProgressBar takes its value straight from app data, so it must place any number without
 * breaking: out of range, NaN, or against an empty range. Screen readers read the bar from its
 * ARIA attributes, which must match what it draws.
 */
describe('ProgressBar', () => {
    beforeAll(() => initTestAppAsync());

    describe('fill', () => {
        it('fills in proportion to the value, on a 0 to 100 scale by default', () => {
            expect(fillWidth(progressBar({value: 72}))).toBe('72%');
        });

        it('measures the value from min to max', () => {
            expect(fillWidth(progressBar({value: 15, min: 10, max: 30}))).toBe('25%');
        });

        it('takes the default for a null min or max', () => {
            expect(fillWidth(progressBar({value: 50, max: null}))).toBe('50%');
            expect(fillWidth(progressBar({value: 50, min: null}))).toBe('50%');
            expect(figure(progressBar({value: 50, min: null, max: null}))).toBe('50%');
        });

        it.each([
            ['above max', {value: 250}, '100%'],
            ['below min', {value: -40}, '0%'],
            ['Infinity', {value: Infinity}, '100%'],
            ['NaN', {value: NaN}, '0%'],
            ['a max equal to min', {value: 5, min: 5, max: 5}, '0%'],
            ['a max below min', {value: 5, min: 10, max: 0}, '0%'],
            ['a NaN max', {value: 5, max: NaN}, '0%'],
            ['a value that is not a number', {value: '72' as any}, '0%']
        ])('clamps the fill for %s', (_, props, width) => {
            expect(fillWidth(progressBar(props))).toBe(width);
        });
    });

    describe('figure', () => {
        it('defaults to the value as a whole percent of the range', () => {
            expect(figure(progressBar({value: 1, max: 3}))).toBe('33%');
            expect(figure(progressBar({value: 500}))).toBe('100%');
        });

        it.each([
            [99.6, '99%'],
            [99.99, '99%'],
            [100, '100%'],
            [0.4, '1%'],
            [0.001, '1%'],
            [0, '0%'],
            [49.5, '50%']
        ])('reads 100%% only for a full bar and 0%% only for an empty one: %s', (value, text) => {
            expect(figure(progressBar({value}))).toBe(text);
        });

        it('shows the valueLabel in place of the percent, including element content', () => {
            expect(figure(progressBar({value: 72, valueLabel: '72 of 100 GB'}))).toBe(
                '72 of 100 GB'
            );
            expect(figure(progressBar({value: 72, valueLabel: span('7.2', span('m'))}))).toBe(
                '7.2m'
            );
        });

        it.each([
            ['null', null],
            ['false', false],
            ['an empty string', ''],
            ['a string of spaces', '  ']
        ])('takes the default percent for a valueLabel of %s', (_, valueLabel) => {
            expect(figure(progressBar({value: 72, valueLabel}))).toBe('72%');
        });

        it('is left out when showValueLabel is false, and shown when it is null', () => {
            const {container} = render(progressBar({value: 72, showValueLabel: false}));
            expect(part(container, 'value-label')).toBeNull();
            expect(part(container, 'header')).toBeNull();

            expect(figure(progressBar({value: 72, showValueLabel: null}))).toBe('72%');
        });

        it('is left out when the value cannot be placed, in place of a NaN figure', () => {
            expect(figure(progressBar({value: NaN}))).toBeNull();
            expect(figure(progressBar({value: 5, min: 5, max: 5}))).toBeNull();
        });
    });

    describe('label', () => {
        it.each([
            ['null', null],
            ['false', false],
            ['an empty string', ''],
            ['a string of spaces', '  ']
        ])('renders nothing for a label of %s, and no header with no figure', (_, label) => {
            const {container} = render(progressBar({value: 1, label, showValueLabel: false}));

            expect(part(container, 'label')).toBeNull();
            expect(part(container, 'header')).toBeNull();
            expect(root(container).hasAttribute('aria-labelledby')).toBe(false);
        });
    });

    describe('indeterminate', () => {
        it.each([
            ['no', {}],
            ['a null', {value: null}]
        ])('marks a bar with %s value, with no figure, fill width or value to read', (_, props) => {
            const {container} = render(progressBar({...props, target: 50}));
            const bar = root(container);

            expect(bar.classList).toContain('xh-progress-bar--indeterminate');
            expect(part(container, 'fill').style.width).toBe('');
            expect(part(container, 'value-label')).toBeNull();
            expect(part(container, 'target')).toBeNull();
            expect(bar.hasAttribute('aria-valuenow')).toBe(false);
        });

        it('shows a valueLabel when given one', () => {
            expect(figure(progressBar({valueLabel: 'Loading'}))).toBe('Loading');
        });
    });

    describe('target', () => {
        it('marks a value on the track, at its place in the range', () => {
            expect(targetAt(progressBar({value: 40, target: 80}))).toBe('0.8');
            expect(targetAt(progressBar({value: 40, target: 15, min: 10, max: 30}))).toBe('0.25');
        });

        it('marks a target at either bound', () => {
            expect(targetAt(progressBar({value: 40, target: 0}))).toBe('0');
            expect(targetAt(progressBar({value: 40, target: 100}))).toBe('1');
        });

        it.each([
            ['no target', {}],
            ['a null target', {target: null}],
            ['a target above max', {target: 400}],
            ['a target below min', {target: -1}],
            ['a NaN target', {target: NaN}],
            ['a range it cannot place a target in', {target: 5, max: 0}]
        ])('draws no marker for %s', (_, props) => {
            expect(targetAt(progressBar({value: 40, ...props}))).toBeNull();
        });
    });

    describe('accessibility', () => {
        it('is a progressbar that reports its range, clamped value and figure', () => {
            const {container} = render(progressBar({value: 45, min: 10, max: 30}));
            const bar = root(container);

            expect(bar.getAttribute('role')).toBe('progressbar');
            expect(bar.getAttribute('aria-valuemin')).toBe('10');
            expect(bar.getAttribute('aria-valuemax')).toBe('30');
            expect(bar.getAttribute('aria-valuenow')).toBe('30');
            expect(bar.getAttribute('aria-valuetext')).toBe('100%');
        });

        it('is labelled by its label, or by an aria-label from domAttrs', () => {
            const labelled = render(progressBar({value: 1, label: 'Upload'})).container;
            expect(root(labelled).getAttribute('aria-labelledby')).toBe(part(labelled, 'label').id);

            const bare = render(
                progressBar({value: 1, domAttrs: {'aria-label': 'Upload'}})
            ).container;
            expect(root(bare).hasAttribute('aria-labelledby')).toBe(false);
            expect(root(bare).getAttribute('aria-label')).toBe('Upload');
        });

        it('reports no value or range for a value it cannot place', () => {
            const bar = root(render(progressBar({value: NaN, max: NaN})).container);

            expect(bar.hasAttribute('aria-valuenow')).toBe(false);
            expect(bar.hasAttribute('aria-valuemin')).toBe(false);
            expect(bar.hasAttribute('aria-valuemax')).toBe(false);
            expect(bar.hasAttribute('aria-valuetext')).toBe(false);
        });
    });

    it('applies intent, className, layout props and testId to its root', () => {
        const {container} = render(
            progressBar({
                value: 90,
                intent: 'danger',
                className: 'my-bar',
                width: 200,
                testId: 'risk'
            })
        );
        const bar = root(container);

        expect(bar.classList).toContain('xh-progress-bar--intent-danger');
        expect(bar.classList).toContain('my-bar');
        expect(bar.style.width).toBe('200px');
        expect(bar.getAttribute('data-testid')).toBe('risk');
    });
});

function root(container: HTMLElement): HTMLElement {
    return container.querySelector('.xh-progress-bar');
}

function part(container: HTMLElement, name: string): HTMLElement {
    return container.querySelector(`.xh-progress-bar__${name}`);
}

function fillWidth(bar: ReturnType<typeof progressBar>): string {
    return part(render(bar).container, 'fill').style.width;
}

function figure(bar: ReturnType<typeof progressBar>): string {
    return part(render(bar).container, 'value-label')?.textContent ?? null;
}

/** Where the target marker sits along the track, from 0 to 1. Null with no marker. */
function targetAt(bar: ReturnType<typeof progressBar>): string {
    const marker = part(render(bar).container, 'target');
    return marker ? marker.style.getPropertyValue('--xh-progress-bar-target-fraction') : null;
}
