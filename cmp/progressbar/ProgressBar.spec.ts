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

        it('shows the valueLabel in place of the percent, including element content', () => {
            expect(figure(progressBar({value: 72, valueLabel: '72 of 100 GB'}))).toBe(
                '72 of 100 GB'
            );
            expect(figure(progressBar({value: 72, valueLabel: span('7.2', span('m'))}))).toBe(
                '7.2m'
            );
        });

        it('is left out when showValueLabel is false, with no header on a bar with no label', () => {
            const {container} = render(progressBar({value: 72, showValueLabel: false}));

            expect(part(container, 'value-label')).toBeNull();
            expect(part(container, 'header')).toBeNull();
        });

        it('is left out when the value cannot be placed, in place of a NaN figure', () => {
            expect(figure(progressBar({value: NaN}))).toBeNull();
            expect(figure(progressBar({value: 5, min: 5, max: 5}))).toBeNull();
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
        it('marks a value on the track, clamped to the range', () => {
            expect(targetLeft(progressBar({value: 40, target: 80}))).toBe('80%');
            expect(targetLeft(progressBar({value: 40, target: 15, min: 10, max: 30}))).toBe('25%');
            expect(targetLeft(progressBar({value: 40, target: 400}))).toBe('100%');
        });

        it('draws no marker unless given a target it can place', () => {
            expect(targetLeft(progressBar({value: 40}))).toBeNull();
            expect(targetLeft(progressBar({value: 40, target: NaN}))).toBeNull();
            expect(targetLeft(progressBar({value: 40, target: 5, max: 0}))).toBeNull();
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

function targetLeft(bar: ReturnType<typeof progressBar>): string {
    return part(render(bar).container, 'target')?.style.left ?? null;
}
