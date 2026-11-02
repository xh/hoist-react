/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, MenuItemLike} from '@xh/hoist/core';
import {menu} from '@xh/hoist/mobile/cmp/menu/impl/Menu';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The mobile Menu lists tappable items. These guard how a tap reaches an item's action and when
 * the menu asks to be dismissed.
 */
describe('Menu (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('runs the item action and dismisses the menu on tap', () => {
        const actionFn = vi.fn(),
            onDismiss = vi.fn();
        renderMenu([{text: 'Copy', actionFn, testId: 'copy'}], onDismiss);
        fireEvent.click(screen.getByTestId('copy'));
        expect(actionFn).toHaveBeenCalledOnce();
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('keeps the menu open for an item with keepMenuOpen', () => {
        const onDismiss = vi.fn();
        renderMenu(
            [{text: 'Toggle', actionFn: () => {}, keepMenuOpen: true, testId: 'tog'}],
            onDismiss
        );
        fireEvent.click(screen.getByTestId('tog'));
        expect(onDismiss).not.toHaveBeenCalled();
    });

    it('renders dividers and headings, and omits hidden items', () => {
        const {container} = renderMenu([
            {heading: 'Edit'},
            {text: 'Copy', actionFn: () => {}, testId: 'copy'},
            '-',
            {text: 'Secret', actionFn: () => {}, hidden: true, testId: 'secret'},
            {text: 'Paste', actionFn: () => {}, testId: 'paste'}
        ]);
        expect(container.querySelector('.xh-menu__list__heading').textContent).toBe('Edit');
        expect(container.querySelectorAll('.xh-menu__list__divider')).toHaveLength(1);
        expect(screen.queryByTestId('secret')).toBeNull();
        expect(screen.getByTestId('paste')).not.toBeNull();
    });

    it('dismisses itself when it has nothing to show', async () => {
        const onDismiss = vi.fn();
        renderMenu([{text: 'Secret', actionFn: () => {}, hidden: true}], onDismiss);
        await waitFor(() => expect(onDismiss).toHaveBeenCalled());
    });
});

//------------------
// Helpers
//------------------
function renderMenu(menuItems: MenuItemLike[], onDismiss = () => {}) {
    // Menu renders within a MenuButton, with its model in context.
    const model = new HostModel();
    onTestFinished(() => model.destroy());
    return render(menu({model, menuItems, onDismiss}));
}

class HostModel extends HoistModel {}
