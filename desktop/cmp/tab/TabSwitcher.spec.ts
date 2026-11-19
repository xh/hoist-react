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
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How desktop tab switchers run `extraMenuItems` in a tab's context menu. Each item's `actionFn`
 * and `prepareFn` receive the right-clicked tab, at every level of a submenu. Also how a switcher
 * with `enableOverflow` scrolls its tab strip to show a newly active tab.
 */
describe('TabSwitcher', () => {
    beforeAll(() => initTestAppAsync());

    describe('tab strip', () => {
        const renderStrip = () => {
            const model = new TabContainerModel({
                tabs: [
                    {id: 'alpha', title: 'Alpha', content: () => null},
                    {id: 'beta', title: 'Beta', content: () => null, disabled: true},
                    {id: 'gamma', title: 'Gamma', content: () => null}
                ]
            });
            onTestFinished(() => model.destroy());
            render(tabSwitcher({model}));
            return {model, tabs: screen.getAllByRole('tab')};
        };

        it('renders a tablist of tabs, with only the active one in the tab order', () => {
            const {model, tabs} = renderStrip();
            expect(screen.getByRole('tablist')).toBeTruthy();
            expect(tabs.map(it => it.getAttribute('data-tab-id'))).toEqual([
                'alpha',
                'beta',
                'gamma'
            ]);
            expect(tabs.map(it => it.getAttribute('aria-selected'))).toEqual([
                'true',
                'false',
                'false'
            ]);
            expect(tabs.map(it => it.getAttribute('aria-disabled'))).toEqual([
                'false',
                'true',
                'false'
            ]);
            expect(tabs[0].tabIndex).toBe(0);
            expect(tabs[2].tabIndex).toBe(-1);
            expect(tabs[0].id).toBe(`xh-tab-title_${model.xhId}_alpha`);
        });

        it('activates a tab on click, but not a disabled one', () => {
            const {model, tabs} = renderStrip();
            fireEvent.click(tabs[1]);
            expect(model.activeTabId).toBe('alpha');
            fireEvent.click(tabs[2]);
            expect(model.activeTabId).toBe('gamma');
        });

        it('moves focus with the arrow keys, skipping disabled tabs', () => {
            const {tabs} = renderStrip();
            tabs[0].focus();
            fireEvent.keyDown(tabs[0], {key: 'ArrowRight'});
            expect(document.activeElement).toBe(tabs[2]);
        });

        it('activates the focused tab on Enter', () => {
            const {model, tabs} = renderStrip();
            fireEvent.keyPress(tabs[2], {key: 'Enter', charCode: 13});
            expect(model.activeTabId).toBe('gamma');
        });
    });

    describe('with enableOverflow', () => {
        // Guards #4982: a scrolling panel around the switcher jumped on every tab change.
        it('scrolls its tab strip just far enough to show a newly active tab', async () => {
            const {model, strip} = renderOverflowSwitcher(80); // Beta ends 30px past the strip.

            model.activateTab('beta');

            await waitFor(() =>
                expect(strip.scrollBy).toHaveBeenCalledWith({left: 30, top: 0, behavior: 'auto'})
            );
        });

        it('leaves its tab strip alone when a newly active tab is already in view', async () => {
            const {model, strip} = renderOverflowSwitcher(40);

            model.activateTab('beta');

            await wait(50);
            expect(strip.scrollBy).not.toHaveBeenCalled();
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

/**
 * Render a top switcher with `enableOverflow` and a 100px-wide tab strip, with the 50px-wide `beta`
 * tab starting `betaLeft` px from the strip's left edge. jsdom has no layout, so these positions
 * are mocked, and so is the strip's `scrollBy()`.
 */
function renderOverflowSwitcher(betaLeft: number) {
    const model = createModel('static'),
        {container} = render(tabSwitcher({model, enableOverflow: true})),
        strip = container.querySelector<HTMLElement>('.xh-tab-switcher__scroll'),
        beta = container.querySelector<HTMLElement>('.xh-tab-list__tab[data-tab-id=beta]');

    vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue(rect(0, 100));
    vi.spyOn(beta, 'getBoundingClientRect').mockReturnValue(rect(betaLeft, betaLeft + 50));
    strip.scrollBy = vi.fn();
    return {model, strip};
}

/** A 30px-tall box from `left` to `right`, the height of a tab strip and its tabs. */
function rect(left: number, right: number): DOMRect {
    return {left, right, top: 0, bottom: 30} as DOMRect;
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
