/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';
import {baseUiMenuButton, type BaseUiMenuItemLike} from './BaseUiMenu';

/**
 * The filter of a Base UI menu, as shown by the add view menus of DashContainer and DashCanvas.
 * Users type to find an item among many, so a query must reach items within nested submenus.
 */
describe('baseUiMenuButton', () => {
    beforeAll(() => initTestAppAsync());

    describe('filter', () => {
        it('lists matching items from nested submenus, with their path', async () => {
            await openFilteredMenu(CHART_ITEMS, 'line');

            expect(listedItems()).toEqual([
                ['Line Chart', 'Charts › Basic'],
                ['Spline', 'Charts › Smooth'],
                ['Area Spline', 'Charts › Smooth']
            ]);
        });

        it('matches items on the text of the submenus that hold them', async () => {
            await openFilteredMenu(CHART_ITEMS, 'smooth');

            expect(listedItems()).toEqual([
                ['Spline', 'Charts › Smooth'],
                ['Area Spline', 'Charts › Smooth']
            ]);
        });

        it('skips hidden items and the items of disabled submenus', async () => {
            await openFilteredMenu(
                [
                    {text: 'Grid', hidden: true},
                    {text: 'Grids', disabled: true, items: [{text: 'Tree Grid'}]},
                    {text: 'Charts', items: [{text: 'Grid Lines'}]}
                ],
                'grid'
            );

            expect(listedItems()).toEqual([['Grid Lines', 'Charts']]);
        });

        it('runs the actionFn of a matching item with the menu context, then closes', async () => {
            const actionFn = vi.fn(),
                context = {contextMenuEvent: null};
            await openFilteredMenu(
                [{text: 'Charts', items: [{text: 'Pie Chart', testId: 'pie', actionFn}]}],
                'pie',
                context
            );

            await act(async () => fireEvent.click(screen.getByTestId('pie')));

            await waitFor(() => expect(actionFn).toHaveBeenCalledOnce());
            expect(actionFn.mock.calls[0][1]).toBe(context);
            await waitFor(() => expect(document.querySelector('.xh-base-ui-menu')).toBeNull());
        });
    });
});

//------------------
// Test support
//------------------
const CHART_ITEMS: BaseUiMenuItemLike[] = [
    {
        text: 'Charts',
        items: [
            {text: 'Basic', items: [{text: 'Line Chart'}, {text: 'Bar Chart'}]},
            {text: 'Smooth', items: [{text: 'Spline'}, {text: 'Area Spline'}]}
        ]
    }
];

async function openFilteredMenu(menuItems: BaseUiMenuItemLike[], query: string, context = {}) {
    render(baseUiMenuButton({testId: 'add', text: 'Add', menuItems, filterable: true, context}));

    fireEvent.click(screen.getByTestId('add'));
    const input = await screen.findByRole('searchbox');
    fireEvent.change(input, {target: {value: query}});
    await waitFor(() => expect(listedItems()).not.toHaveLength(0));
}

/** Items listed in the open menu, each as its text and path. */
function listedItems(): string[][] {
    return [...document.querySelectorAll('.xh-base-ui-menu__item')].map(it => [
        it.querySelector('.xh-base-ui-menu__text')?.textContent,
        it.querySelector('.xh-base-ui-menu__path')?.textContent
    ]);
}
