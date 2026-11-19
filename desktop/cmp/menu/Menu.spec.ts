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
});
