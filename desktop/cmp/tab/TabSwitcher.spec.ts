/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {tabContainer, TabContainerModel, type TabSwitcherMenuContext} from '@xh/hoist/cmp/tab';
import {type MenuItem, type MenuItemLike, type MenuToken} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How desktop tab switchers run `extraMenuItems` in a tab's context menu. Each item's `actionFn`
 * and `prepareFn` receive the right-clicked tab, at every level of a submenu.
 */
describe('TabSwitcher', () => {
    beforeAll(() => initTestAppAsync());

    describe.each(['static', 'dynamic'] as const)('%s switcher context menu', mode => {
        it('passes the tab to an item in a static submenu', async () => {
            const actionFn = vi.fn();
            renderTabs(mode, [
                {text: 'Copy', testId: 'copy', items: [{text: 'Link', testId: 'link', actionFn}]}
            ]);

            await clickSubmenuItem('Beta', 'copy', 'link');

            await waitFor(() => expect(actionFn).toHaveBeenCalledOnce());
            expect(actionFn.mock.calls[0][1].tab.id).toBe('beta');
        });

        it('passes the tab to an item that a prepareFn adds', async () => {
            const actionFn = vi.fn();
            renderTabs(mode, [
                {
                    text: 'Copy',
                    testId: 'copy',
                    prepareFn: (me: MenuItem<MenuToken, TabSwitcherMenuContext>) => {
                        me.items = [{text: 'Link', testId: 'link', actionFn}];
                    }
                }
            ]);

            await clickSubmenuItem('Beta', 'copy', 'link');

            await waitFor(() => expect(actionFn).toHaveBeenCalledOnce());
            expect(actionFn.mock.calls[0][1].tab.id).toBe('beta');
        });
    });
});

//------------------
// Test support
//------------------
function renderTabs(
    mode: 'static' | 'dynamic',
    extraMenuItems: MenuItemLike<MenuToken, TabSwitcherMenuContext>[]
) {
    const model = new TabContainerModel({
        tabs: [
            {id: 'alpha', title: 'Alpha', content: () => null},
            {id: 'beta', title: 'Beta', content: () => null}
        ],
        switcher: {mode, extraMenuItems, initialFavorites: ['alpha', 'beta']}
    });
    onTestFinished(() => model.destroy());
    render(tabContainer({model}));
}

/** Right-click a tab, open a submenu, and click one of its items. */
async function clickSubmenuItem(tabTitle: string, submenuTestId: string, itemTestId: string) {
    fireEvent.contextMenu(await screen.findByText(tabTitle));
    fireEvent.mouseEnter(await screen.findByTestId(submenuTestId));
    fireEvent.click(await screen.findByTestId(itemTestId));
}
