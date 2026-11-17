/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {tabContainer, TabContainerModel, type TabSwitcherMenuContext} from '@xh/hoist/cmp/tab';
import type {MenuItem, MenuItemLike, MenuToken} from '@xh/hoist/core';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import '@xh/hoist/desktop/register';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterAll, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How desktop tab switchers run `extraMenuItems` in a tab's context menu. Each item's `actionFn`
 * and `prepareFn` receive the right-clicked tab, at every level of a submenu. Also the options a
 * switcher with `enableOverflow` passes when it scrolls a newly active tab into view.
 */
describe('TabSwitcher', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        // jsdom has no layout, so lacks the `scrollIntoView()` that an overflowing switcher calls.
        Element.prototype.scrollIntoView = () => {};
    });

    afterAll(() => {
        delete Element.prototype.scrollIntoView;
    });

    describe('with enableOverflow', () => {
        // Guards #4982: a scrolling panel around the switcher jumped on every tab change.
        it('calls scrollIntoView() on the active tab with `block` and `inline` options set to `nearest`', async () => {
            const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
            onTestFinished(() => spy.mockRestore());
            const model = createModel('static');
            render(tabSwitcher({model, enableOverflow: true}));

            model.activateTab('beta');

            await waitFor(() => expect(spy).toHaveBeenCalledOnce());
            expect(spy.mock.contexts[0]).toHaveProperty('dataset.tabId', 'beta');
            expect(spy).toHaveBeenCalledWith({block: 'nearest', inline: 'nearest'});
        });
    });

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
    render(tabContainer({model: createModel(mode, extraMenuItems)}));
}

function createModel(
    mode: 'static' | 'dynamic',
    extraMenuItems: MenuItemLike<MenuToken, TabSwitcherMenuContext>[] = []
): TabContainerModel {
    const ret = new TabContainerModel({
        tabs: [
            {id: 'alpha', title: 'Alpha', content: () => null},
            {id: 'beta', title: 'Beta', content: () => null}
        ],
        switcher: {mode, extraMenuItems, initialFavorites: ['alpha', 'beta']}
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Right-click a tab, open a submenu, and click one of its items. */
async function clickSubmenuItem(tabTitle: string, submenuTestId: string, itemTestId: string) {
    fireEvent.contextMenu(await screen.findByText(tabTitle));
    fireEvent.mouseEnter(await screen.findByTestId(submenuTestId));
    fireEvent.click(await screen.findByTestId(itemTestId));
}
