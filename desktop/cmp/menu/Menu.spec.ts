/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {menu} from '@xh/hoist/desktop/cmp/menu';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * Keyboard and submenu behavior of the desktop Menu. Every desktop menu - MenuButton, the app
 * menu, context menus - renders through it, so keyboard users depend on these keys.
 */
describe('Menu', () => {
    beforeAll(() => initTestAppAsync());

    const items = () => [
        {text: 'Apple', testId: 'apple'},
        {text: 'Banana', testId: 'banana'},
        {text: 'Blueberry', testId: 'blueberry', disabled: true},
        {text: 'Cherry', testId: 'cherry'}
    ];

    const key = (k: string) => fireEvent.keyDown(document.activeElement, {key: k});

    it('moves focus between enabled items with the arrow, Home and End keys', () => {
        render(menu({menuItems: items()}));
        screen.getByTestId('apple').focus();

        key('ArrowDown');
        expect(document.activeElement).toBe(screen.getByTestId('banana'));
        key('ArrowDown'); // Skips the disabled Blueberry.
        expect(document.activeElement).toBe(screen.getByTestId('cherry'));
        key('ArrowDown'); // Wraps around.
        expect(document.activeElement).toBe(screen.getByTestId('apple'));
        key('End');
        expect(document.activeElement).toBe(screen.getByTestId('cherry'));
        key('Home');
        expect(document.activeElement).toBe(screen.getByTestId('apple'));
        key('ArrowUp');
        expect(document.activeElement).toBe(screen.getByTestId('cherry'));
    });

    it('moves focus to the next item starting with the characters typed', () => {
        render(menu({menuItems: items()}));
        screen.getByTestId('apple').focus();

        key('c');
        expect(document.activeElement).toBe(screen.getByTestId('cherry'));
        key('a'); // "ca" matches nothing, so focus stays.
        expect(document.activeElement).toBe(screen.getByTestId('cherry'));
    });

    it('cycles through the items that start with a letter typed repeatedly', () => {
        render(
            menu({
                menuItems: ['Apple', 'Banana', 'Bread', 'Cherry'].map(text => ({
                    text,
                    testId: text.toLowerCase()
                }))
            })
        );
        screen.getByTestId('apple').focus();

        key('b');
        expect(document.activeElement).toBe(screen.getByTestId('banana'));
        key('b');
        expect(document.activeElement).toBe(screen.getByTestId('bread'));
        key('b');
        expect(document.activeElement).toBe(screen.getByTestId('banana'));
    });

    it('takes a space as part of a search in progress, and as activation otherwise', async () => {
        const saveFn = vi.fn();
        render(
            menu({
                menuItems: [
                    {text: 'Save', testId: 'save', actionFn: saveFn},
                    {text: 'Save As...', testId: 'save-as'}
                ]
            })
        );
        screen.getByTestId('save').focus();

        for (const k of ['s', 'a', 'v', 'e', ' ', 'a']) key(k);
        expect(document.activeElement).toBe(screen.getByTestId('save-as'));

        // Once the search resets, Space activates the focused item.
        screen.getByTestId('save').focus();
        await new Promise(resolve => setTimeout(resolve, 800));
        key(' ');
        await waitFor(() => expect(saveFn).toHaveBeenCalledTimes(1));
    });

    it('moves focus to an item under the pointer only when focus is already in the menu', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        try {
            render(menu({menuItems: items()}));

            input.focus();
            fireEvent.mouseEnter(screen.getByTestId('banana'));
            expect(document.activeElement).toBe(input);

            screen.getByTestId('apple').focus();
            fireEvent.mouseEnter(screen.getByTestId('cherry'));
            expect(document.activeElement).toBe(screen.getByTestId('cherry'));
        } finally {
            input.remove();
        }
    });

    it('runs an item action on Enter', async () => {
        const actionFn = vi.fn();
        render(menu({menuItems: [{text: 'Run', testId: 'run', actionFn}]}));
        screen.getByTestId('run').focus();

        key('Enter');
        await waitFor(() => expect(actionFn).toHaveBeenCalledTimes(1));
    });

    it('leaves keys on a control in rightElement to that control', async () => {
        const actionFn = vi.fn(),
            onKeyDown = vi.fn();
        render(
            menu({
                menuItems: [
                    {
                        text: 'Favorite',
                        testId: 'fav',
                        actionFn,
                        rightElement: createElement(
                            'button',
                            {'data-testid': 'fav-delete', onKeyDown},
                            'x'
                        )
                    }
                ]
            })
        );
        screen.getByTestId('fav-delete').focus();

        key('Enter');
        expect(onKeyDown).toHaveBeenCalledTimes(1);
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(actionFn).not.toHaveBeenCalled();
    });

    it('treats a click on non-control content in rightElement as a click on the item', async () => {
        const actionFn = vi.fn();
        render(
            menu({
                menuItems: [
                    {
                        text: 'Copy',
                        actionFn,
                        rightElement: createElement('span', {'data-testid': 'shortcut'}, 'Ctrl+C')
                    }
                ]
            })
        );

        fireEvent.click(screen.getByTestId('shortcut'));
        await waitFor(() => expect(actionFn).toHaveBeenCalledTimes(1));
    });

    const linkMenu = () =>
        menu({
            menuItems: [
                {text: 'Home', testId: 'home', href: 'https://xh.io', target: '_blank'},
                {text: 'Offline', testId: 'offline', href: 'https://xh.io', disabled: true},
                {
                    text: 'Docs',
                    testId: 'docs',
                    rightElement: createElement(
                        'a',
                        {href: 'https://xh.io', 'data-testid': 'docs-link'},
                        'Open'
                    )
                }
            ]
        });

    it('renders an item with an href as a link that opens in its target, unless disabled', () => {
        render(linkMenu());

        const home = screen.getByTestId('home');
        expect(home.getAttribute('href')).toBe('https://xh.io');
        expect(home.getAttribute('target')).toBe('_blank');
        expect(screen.getByTestId('offline').hasAttribute('href')).toBe(false);
    });

    it('shows the browser menu on a right-click on a link, and on nothing else in the menu', () => {
        render(linkMenu());

        // fireEvent returns false when a handler called preventDefault().
        expect(fireEvent.contextMenu(screen.getByTestId('home'))).toBe(true);
        expect(fireEvent.contextMenu(screen.getByTestId('docs-link'))).toBe(true);
        expect(fireEvent.contextMenu(screen.getByTestId('docs'))).toBe(false);
        expect(fireEvent.contextMenu(screen.getByTestId('offline'))).toBe(false);
    });

    it('keeps a right-click within the menu from reaching a context menu beneath it', () => {
        const onContextMenu = vi.fn();
        render(createElement('div', {onContextMenu}, linkMenu()));

        fireEvent.contextMenu(screen.getByTestId('home'));
        fireEvent.contextMenu(screen.getByTestId('docs-link'));
        fireEvent.contextMenu(screen.getByTestId('docs'));
        expect(onContextMenu).not.toHaveBeenCalled();
    });

    it('opens a submenu with ArrowRight and closes it with ArrowLeft', async () => {
        render(
            menu({
                menuItems: [
                    {text: 'Export', testId: 'export', items: [{text: 'CSV', testId: 'csv'}]}
                ]
            })
        );
        const parent = screen.getByTestId('export');
        parent.focus();

        key('ArrowRight');
        await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('csv')));
        expect(parent.getAttribute('aria-expanded')).toBe('true');

        key('ArrowLeft');
        await waitFor(() => expect(screen.queryByTestId('csv')).toBeNull());
        expect(document.activeElement).toBe(parent);
    });

    it('opens a submenu outside its parent menu, which scrolls and would clip it', async () => {
        render(
            menu({
                menuItems: [
                    {text: 'Export', testId: 'export', items: [{text: 'CSV', testId: 'csv'}]}
                ]
            })
        );
        const parent = screen.getByTestId('export');
        parent.focus();

        key('ArrowRight');
        const submenuItem = await screen.findByTestId('csv');
        expect(parent.closest('.xh-menu-list').contains(submenuItem)).toBe(false);
    });

    it('marks items, headings and submenus with xh-* classes only', async () => {
        const {container} = render(
            menu({
                menuItems: [
                    {heading: 'Section'},
                    {text: 'Go', testId: 'go', intent: 'danger', active: true},
                    {text: 'Off', testId: 'off', disabled: true},
                    '-',
                    {text: 'More', testId: 'more', items: [{text: 'Sub', testId: 'sub'}]}
                ]
            })
        );
        const go = screen.getByTestId('go'),
            more = screen.getByTestId('more');
        expect(go.className).toContain('xh-menu-item--intent-danger');
        expect(go.className).toContain('xh-menu-item--active');
        expect(screen.getByTestId('off').className).toContain('xh-menu-item--disabled');
        expect(container.querySelector('.xh-menu-header__title').textContent).toBe('Section');
        expect(container.querySelector('.xh-menu-divider')).not.toBeNull();
        expect(more.querySelector('.xh-menu-item__submenu-icon')).not.toBeNull();

        more.focus();
        key('ArrowRight');
        const sub = await screen.findByTestId('sub');
        expect(sub.closest('.xh-menu__submenu')).not.toBeNull();
        for (const el of [container, sub.closest('.xh-menu__submenu')]) {
            const classes = [el, ...el.querySelectorAll('*')].flatMap(e => [...e.classList]);
            expect(
                classes.filter(c =>
                    /^bp6-(menu|submenu|heading|icon|fill|text|intent|active|disabled)/.test(c)
                )
            ).toEqual([]);
        }
    });
});
