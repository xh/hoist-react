/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {steps} from '@xh/hoist/cmp/steps';
import type {StepSpec} from '@xh/hoist/cmp/steps';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * Steps derives each step's status from `current` unless the step sets its own, and apps rely on
 * that rule to drive a wizard or a lifecycle from one index. The status must also reach screen
 * readers, and a clickable step must work from the keyboard.
 */
describe('Steps', () => {
    beforeAll(() => initTestAppAsync());

    const order: StepSpec[] = [
        {title: 'Submitted'},
        {title: 'Approved'},
        {title: 'Routed'},
        {title: 'Filled'}
    ];

    describe('status', () => {
        it('completes steps before current and leaves later steps pending', () => {
            expect(statuses(steps({steps: order, current: 2}))).toEqual([
                'complete',
                'complete',
                'current',
                'pending'
            ]);
        });

        it.each([
            ['no current', null, ['pending', 'pending', 'pending', 'pending']],
            ['a current before the first step', -1, ['pending', 'pending', 'pending', 'pending']],
            ['a current past the last step', 4, ['complete', 'complete', 'complete', 'complete']],
            ['a NaN current', NaN, ['pending', 'pending', 'pending', 'pending']]
        ])('handles %s', (_, current, expected) => {
            expect(statuses(steps({steps: order, current}))).toEqual(expected);
        });

        it("lets a step's own status win over current", () => {
            const withError: StepSpec[] = [
                {title: 'Submitted'},
                {title: 'Approved', status: 'error'},
                {title: 'Routed', status: 'pending'},
                {title: 'Filled', status: 'warning'}
            ];

            expect(statuses(steps({steps: withError, current: 3}))).toEqual([
                'complete',
                'error',
                'pending',
                'warning'
            ]);
        });

        it('ignores a status it does not know', () => {
            const odd = [{title: 'Submitted', status: 'done' as any}, {title: 'Approved'}];

            expect(statuses(steps({steps: odd, current: 1}))).toEqual(['complete', 'current']);
        });
    });

    describe('marker', () => {
        it('shows the step number, or an icon for a complete, warning or error step', () => {
            const {container} = render(
                steps({
                    steps: [
                        {title: 'A', status: 'complete'},
                        {title: 'B', status: 'current'},
                        {title: 'C', status: 'error'},
                        {title: 'D', status: 'warning'},
                        {title: 'E'}
                    ]
                })
            );
            const markers = Array.from(container.querySelectorAll('.xh-steps__marker'));

            expect(markers.map(it => it.textContent)).toEqual(['', '2', '', '', '5']);
            expect(markers.map(it => it.querySelector('svg') != null)).toEqual([
                true,
                false,
                true,
                true,
                false
            ]);
        });

        it("shows a step's own icon in place of the default, whatever its status", () => {
            const {container} = render(
                steps({
                    steps: [
                        {title: 'A', icon: span({className: 'custom-icon'})},
                        {title: 'B', icon: span({className: 'custom-icon'})}
                    ],
                    current: 1
                })
            );
            const markers = Array.from(container.querySelectorAll('.xh-steps__marker'));

            expect(markers.map(it => it.querySelector('.custom-icon') != null)).toEqual([
                true,
                true
            ]);
            expect(markers.map(it => it.textContent)).toEqual(['', '']);
        });

        it('names a status shown by icon alone for screen readers', () => {
            const {container} = render(
                steps({steps: [{title: 'A', status: 'error'}, {title: 'B'}], current: 2})
            );
            const [error, complete] = Array.from(container.querySelectorAll('.xh-steps__marker'));

            expect(error.getAttribute('role')).toBe('img');
            expect(error.getAttribute('aria-label')).toBe('Error');
            expect(complete.getAttribute('aria-label')).toBe('Complete');
        });
    });

    describe('content', () => {
        it('renders the title, and the description and detail only when given', () => {
            const {container} = render(
                steps({
                    steps: [
                        {
                            title: 'Approved',
                            description: span('By ', span('risk')),
                            detail: '10:42'
                        },
                        {title: 'Routed'}
                    ]
                })
            );
            const [approved, routed] = Array.from(container.querySelectorAll('.xh-steps__step'));

            expect(part(approved, 'title').textContent).toBe('Approved');
            expect(part(approved, 'description').textContent).toBe('By risk');
            expect(part(approved, 'detail').textContent).toBe('10:42');
            expect(part(routed, 'description')).toBeNull();
            expect(part(routed, 'detail')).toBeNull();
        });

        it('renders text as text, not as HTML', () => {
            const {container} = render(steps({steps: [{title: '<b>Approved</b>'}]}));

            expect(container.querySelector('b')).toBeNull();
            expect(container.querySelector('.xh-steps__title').textContent).toBe('<b>Approved</b>');
        });

        it('renders nothing when given no steps', () => {
            expect(render(steps({steps: []})).container.innerHTML).toBe('');
            expect(render(steps({steps: null})).container.innerHTML).toBe('');
            expect(render(steps({steps: [null]})).container.innerHTML).toBe('');
        });

        it('skips a missing step and keeps the numbers of the others', () => {
            const {container} = render(steps({steps: [{title: 'A'}, null, {title: 'C'}]}));
            const markers = Array.from(container.querySelectorAll('.xh-steps__marker'));

            expect(markers.map(it => it.textContent)).toEqual(['1', '3']);
        });
    });

    describe('list', () => {
        it('is an ordered list that marks the current step', () => {
            const {container} = render(steps({steps: order, current: 1}));
            const list = container.querySelector('.xh-steps'),
                items = Array.from(list.children);

            expect(list.tagName).toBe('OL');
            expect(items.map(it => it.tagName)).toEqual(['LI', 'LI', 'LI', 'LI']);
            expect(items.map(it => it.getAttribute('aria-current'))).toEqual([
                null,
                'step',
                null,
                null
            ]);
        });

        it('is horizontal by default, and vertical on request', () => {
            const horizontal = render(steps({steps: order})).container,
                vertical = render(steps({steps: order, orientation: 'vertical'})).container;

            expect(horizontal.querySelector('.xh-steps').classList).toContain(
                'xh-steps--horizontal'
            );
            expect(vertical.querySelector('.xh-steps').classList).toContain('xh-steps--vertical');
        });

        it('applies className, layout props and testId to the list', () => {
            const {container} = render(
                steps({steps: order, className: 'my-steps', width: 300, testId: 'lifecycle'})
            );
            const list = container.querySelector<HTMLElement>('.xh-steps');

            expect(list.classList).toContain('my-steps');
            expect(list.style.width).toBe('300px');
            expect(list.getAttribute('data-testid')).toBe('lifecycle');
        });
    });

    describe('onStepClick', () => {
        it('leaves steps as plain content when not set', () => {
            const {container} = render(steps({steps: order, current: 1}));

            expect(container.querySelector('[role="button"]')).toBeNull();
            expect(container.querySelector('[tabindex]')).toBeNull();
        });

        it('calls the handler with the step and its index on a click, Enter or Space', () => {
            const onStepClick = vi.fn(),
                {container} = render(steps({steps: order, current: 1, onStepClick}));
            const buttons = Array.from(container.querySelectorAll('[role="button"]'));

            expect(buttons).toHaveLength(4);
            expect(buttons.map(it => it.getAttribute('tabindex'))).toEqual(['0', '0', '0', '0']);

            fireEvent.click(buttons[0]);
            fireEvent.keyDown(buttons[2], {key: 'Enter'});
            fireEvent.keyDown(buttons[3], {key: ' '});
            fireEvent.keyDown(buttons[3], {key: 'a'});

            expect(onStepClick.mock.calls).toEqual([
                [order[0], 0],
                [order[2], 2],
                [order[3], 3]
            ]);
        });

        it('marks the current step on its button, which is what takes focus', () => {
            const {container} = render(steps({steps: order, current: 1, onStepClick: vi.fn()}));
            const buttons = Array.from(container.querySelectorAll('[role="button"]'));

            expect(buttons.map(it => it.getAttribute('aria-current'))).toEqual([
                null,
                'step',
                null,
                null
            ]);
            expect(container.querySelector('li[aria-current]')).toBeNull();
        });
    });
});

/** The status of each step, read from its modifier class. */
function statuses(el: ReturnType<typeof steps>): string[] {
    const items = render(el).container.querySelectorAll('.xh-steps__step');
    return Array.from(items).map(it => it.className.match(/xh-steps__step--(\w+)/)[1]);
}

function part(step: Element, name: string): HTMLElement {
    return step.querySelector(`.xh-steps__${name}`);
}
