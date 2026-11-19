/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {createRef} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * How the desktop Button and ButtonGroup render and respond. Toolbars, dialogs, forms and app
 * code across desktop build on them.
 */
describe('Button', () => {
    beforeAll(() => initTestAppAsync());

    it('renders a native button with its icon, text and right icon in order', () => {
        render(
            button({
                icon: Icon.add(),
                text: 'Add',
                rightIcon: Icon.chevronDown(),
                testId: 'add'
            })
        );
        const el = screen.getByTestId('add');
        expect(el.tagName).toBe('BUTTON');
        expect(el.getAttribute('type')).toBe('button');
        expect(Array.from(el.children).map(it => it.tagName)).toEqual(['svg', 'SPAN', 'svg']);
        expect(el.querySelector('.xh-button__text').textContent).toBe('Add');
    });

    it('renders no text element for an icon-only button', () => {
        render(button({icon: Icon.add(), testId: 'add'}));
        expect(screen.getByTestId('add').querySelector('.xh-button__text')).toBeNull();
    });

    it('keeps Blueprint class names for its style, intent and state', () => {
        render(
            button({text: 'Go', intent: 'primary', active: true, outlined: true, minimal: false})
        );
        const {classList} = screen.getByRole('button');
        [
            'xh-button',
            'xh-button--outlined',
            'bp6-button',
            'bp6-intent-primary',
            'bp6-active',
            'bp6-outlined'
        ].forEach(cls => expect(classList).toContain(cls));
        expect(classList).not.toContain('bp6-minimal');
    });

    it('defaults to minimal, and takes tooltip as its title', () => {
        render(button({text: 'Go', tooltip: 'Run it'}));
        const el = screen.getByRole('button');
        expect(el.classList).toContain('bp6-minimal');
        expect(el.getAttribute('title')).toBe('Run it');
    });

    it('calls onClick, but not while disabled', () => {
        const onClick = vi.fn(),
            {rerender} = render(button({text: 'Go', onClick}));
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledOnce();

        rerender(button({text: 'Go', onClick, disabled: true}));
        const el = screen.getByRole('button');
        expect(el.hasAttribute('disabled')).toBe(true);
        expect(el.classList).toContain('bp6-disabled');
        fireEvent.click(el);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('applies layout props as styles, relays native attributes, and forwards its ref', () => {
        const ref = createRef<HTMLButtonElement>();
        render(button({text: 'Go', width: 120, 'aria-label': 'Go now', ref} as any));
        const el = screen.getByRole('button');
        expect(el.style.width).toBe('120px');
        expect(el.getAttribute('aria-label')).toBe('Go now');
        expect(ref.current).toBe(el);
    });

    it('groups buttons in a div with Blueprint group classes', () => {
        render(
            buttonGroup({
                testId: 'group',
                fill: true,
                vertical: true,
                children: [button({text: 'A'}), button({text: 'B'})]
            })
        );
        const el = screen.getByTestId('group');
        expect(el.tagName).toBe('DIV');
        ['xh-button-group', 'bp6-button-group', 'bp6-fill', 'bp6-vertical'].forEach(cls =>
            expect(el.classList).toContain(cls)
        );
        expect(el.querySelectorAll('button')).toHaveLength(2);
    });
});
