/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp, HoistModel, type HoistProps} from '@xh/hoist/core';
import {menuButton, type MenuButtonProps} from '@xh/hoist/desktop/cmp/menu';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How the desktop MenuButton renders its `MenuItem` configs. App test suites locate menu items by
 * `testId`, and menus that let users toggle several items in turn rely on `keepMenuOpen`.
 */
describe('MenuButton', () => {
    beforeAll(() => initTestAppAsync());

    it('renders testIds on the button, the menu and its items', async () => {
        render(
            host({
                testId: 'group-by',
                menuItems: [
                    {heading: 'Group By'},
                    {text: 'Region', testId: 'group-by-region'},
                    {text: 'Sector', testId: 'group-by-sector'}
                ]
            })
        );

        fireEvent.click(screen.getByTestId('group-by'));
        await screen.findByTestId('group-by-menu');

        expect(screen.getByTestId('group-by-region').textContent).toBe('Region');
        expect(screen.getByTestId('group-by-sector').textContent).toBe('Sector');
    });

    it('closes when an item is clicked, unless the item sets keepMenuOpen', async () => {
        const actionFn = vi.fn();
        render(
            host({
                testId: 'series',
                menuItems: [
                    {text: 'Toggle', testId: 'toggle', keepMenuOpen: true, actionFn},
                    {text: 'Done', testId: 'done', actionFn}
                ]
            })
        );

        fireEvent.click(screen.getByTestId('series'));
        fireEvent.click(await screen.findByTestId('toggle'));
        await waitFor(() => expect(actionFn).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId('series-menu')).toBeTruthy();

        fireEvent.click(screen.getByTestId('done'));
        await waitFor(() => expect(screen.queryByTestId('series-menu')).toBeNull());
        expect(actionFn).toHaveBeenCalledTimes(2);
    });

    it('re-runs prepareFn while open when the state it reads changes', async () => {
        const model = new SelectionModel();
        onTestFinished(() => model.destroy());
        render(
            host({
                testId: 'series',
                menuItems: [
                    {
                        text: 'Price',
                        testId: 'price',
                        keepMenuOpen: true,
                        prepareFn: me => (me.active = model.selected),
                        actionFn: () => model.toggle()
                    }
                ]
            })
        );

        fireEvent.click(screen.getByTestId('series'));
        const isActive = () => screen.getByTestId('price').classList.contains('bp6-active');
        expect(await screen.findByTestId('price')).toBeTruthy();
        expect(isActive()).toBe(false);

        await act(async () => fireEvent.click(screen.getByTestId('price')));
        await waitFor(() => expect(isActive()).toBe(true));
    });
});

class SelectionModel extends HoistModel {
    @bindable accessor selected = false;

    toggle() {
        this.selected = !this.selected;
    }
}

class HostModel extends HoistModel {}

/**
 * Hosts a MenuButton under a model, as every app view is - MenuButton renders nothing without one
 * in context. Popover transitions are disabled so the menu mounts and unmounts synchronously.
 */
const host = hoistCmp.factory<Omit<MenuButtonProps, 'model'> & HoistProps<HostModel>>({
    model: creates(HostModel),
    render({model, ...props}) {
        return menuButton({...props, popoverProps: {transitionDuration: 0}});
    }
});
