/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * The mobile Button renders a div with the button role. These guard the contract apps rely on -
 * clicks, disabling, and the style classes that app SCSS targets.
 */
describe('Button (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders a button-role element with its text and icon', () => {
        render(button({text: 'Save', icon: Icon.save(), testId: 'save'}));
        const el = screen.getByTestId('save');
        expect(el.getAttribute('role')).toBe('button');
        expect(el.textContent).toBe('Save');
        expect(el.querySelector('svg')).not.toBeNull();
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        render(button({text: 'Go', onClick, testId: 'go'}));
        fireEvent.click(screen.getByTestId('go'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when disabled', () => {
        const onClick = vi.fn();
        render(button({text: 'Go', onClick, disabled: true, testId: 'go'}));
        const el = screen.getByTestId('go');
        expect(el.getAttribute('aria-disabled')).toBe('true');
        fireEvent.click(el);
        expect(onClick).not.toHaveBeenCalled();
    });

    it.each([
        [{}, ['xh-button--standard', 'xh-button--intent-none', 'xh-button--enabled']],
        [{minimal: true, intent: 'primary'}, ['xh-button--minimal', 'xh-button--intent-primary']],
        [{outlined: true, intent: 'danger'}, ['xh-button--outlined', 'xh-button--intent-danger']],
        [{disabled: true, active: true}, ['xh-button--disabled', 'xh-button--active']]
    ] as const)('applies the style classes for %j', (props, classes) => {
        render(button({text: 'x', testId: 'x', ...props}));
        const el = screen.getByTestId('x');
        expect(el.classList.contains('xh-button')).toBe(true);
        classes.forEach(cls => expect(el.classList.contains(cls)).toBe(true));
    });

    it('passes layout props as inline style', () => {
        render(button({text: 'x', testId: 'x', width: 120, marginLeft: 4}));
        const {style} = screen.getByTestId('x');
        expect(style.width).toBe('120px');
        expect(style.marginLeft).toBe('4px');
    });
});
