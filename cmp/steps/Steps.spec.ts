/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {htmlButton, span} from '@xh/hoist/cmp/layout';
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
        it('shows the step number, except on a complete, warning or error step', () => {
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

            expect(markerTexts(container)).toEqual(['', '2', '', '', '5']);
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

        it('leaves out a null or omitted step, and numbers the steps that show', () => {
            const {container} = render(
                steps({
                    steps: [{title: 'A'}, null, {title: 'B', omit: true}, {title: 'C'}]
                })
            );

            expect(markerTexts(container)).toEqual(['1', '2']);
            expect(titles(container)).toEqual(['A', 'C']);
        });

        it('counts left-out steps in the index that current refers to', () => {
            const list = [{title: 'A'}, {title: 'B', omit: true}, {title: 'C'}];

            expect(statuses(steps({steps: list, current: 2}))).toEqual(['complete', 'current']);
            expect(statuses(steps({steps: list, current: 1}))).toEqual(['complete', 'pending']);
        });

        it.each([
            ['null', null],
            ['false', false],
            ['an empty string', ''],
            ['a string of spaces', '  ']
        ])('renders no element for a title, description or detail of %s', (_, blank) => {
            const {container} = render(
                steps({steps: [{title: blank, description: blank, detail: blank}]})
            );

            expect(container.querySelector('.xh-steps__marker')).not.toBeNull();
            expect(container.querySelector('.xh-steps__content')).toBeNull();
        });
    });

    describe('list', () => {
        it('marks the current step for screen readers, on its list item', () => {
            const {container} = render(steps({steps: order, current: 1}));

            expect(container.querySelectorAll('[role="list"] > li')).toHaveLength(4);
            expect(
                Array.from(container.querySelectorAll('li')).map(it =>
                    it.getAttribute('aria-current')
                )
            ).toEqual([null, 'step', null, null]);
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

        it('makes a disabled step a disabled button that takes no focus, click or keypress', () => {
            const onStepClick = vi.fn(),
                list = [{title: 'A'}, {title: 'B', disabled: true}, {title: 'C'}],
                {container} = render(steps({steps: list, current: 1, onStepClick}));
            const [, disabled] = Array.from(container.querySelectorAll('[role="button"]'));

            expect(disabled.getAttribute('aria-disabled')).toBe('true');
            expect(disabled.hasAttribute('tabindex')).toBe(false);
            expect(disabled.getAttribute('aria-current')).toBe('step');

            fireEvent.click(disabled);
            fireEvent.keyDown(disabled, {key: 'Enter'});
            expect(onStepClick).not.toHaveBeenCalled();
        });

        it('ignores disabled with no onStepClick', () => {
            const {container} = render(steps({steps: [{title: 'A', disabled: true}]}));

            expect(container.querySelector('[aria-disabled]')).toBeNull();
            expect(container.querySelector('[role="button"]')).toBeNull();
        });

        it('leaves a click or keypress on a control inside a step to that control', () => {
            const onStepClick = vi.fn(),
                dismiss = vi.fn(),
                list = [
                    {
                        title: 'A',
                        detail: htmlButton({
                            className: 'dismiss',
                            onClick: dismiss,
                            item: 'Dismiss'
                        })
                    }
                ],
                {container} = render(steps({steps: list, onStepClick}));
            const control = container.querySelector('.dismiss');

            fireEvent.click(control);
            fireEvent.keyDown(control, {key: 'Enter'});
            fireEvent.keyDown(control, {key: ' '});
            expect(dismiss).toHaveBeenCalledTimes(1);
            expect(onStepClick).not.toHaveBeenCalled();

            fireEvent.click(container.querySelector('.xh-steps__title'));
            expect(onStepClick).toHaveBeenCalledTimes(1);
        });

        it('calls the handler with the index in steps, counting left-out steps', () => {
            const onStepClick = vi.fn(),
                list = [{title: 'A', omit: true}, null, {title: 'C'}],
                {container} = render(steps({steps: list, onStepClick}));

            fireEvent.click(container.querySelector('[role="button"]'));
            expect(onStepClick).toHaveBeenCalledWith(list[2], 2);
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

function markerTexts(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.xh-steps__marker')).map(it => it.textContent);
}

function titles(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.xh-steps__title')).map(it => it.textContent);
}
