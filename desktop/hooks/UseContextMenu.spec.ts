/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, type HoistProps} from '@xh/hoist/core';
import {useContextMenu} from '@xh/hoist/desktop/hooks';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {TEST_ID} from '@xh/hoist/utils/js';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * How a right-click context menu, added with useContextMenu, opens and closes. Panels, grids and
 * dashboards show their context menus this way.
 */
describe('useContextMenu', () => {
    beforeAll(() => initTestAppAsync());

    // Each menu opens in a shared root outside the test's render, so close any left open.
    afterEach(async () => {
        const backdrop = document.querySelector('.xh-context-menu__backdrop');
        if (backdrop) await act(async () => fireEvent.contextMenu(backdrop));
    });

    const target = hoistCmp.factory<HoistProps & {actionFn?: () => void}>({
        model: false,
        render({actionFn}) {
            return useContextMenu(div({[TEST_ID]: 'target', children: 'Target'}), [
                {text: 'Copy', testId: 'copy', actionFn},
                {text: 'Paste', testId: 'paste'}
            ]);
        }
    });

    it('opens at the pointer on a right-click, and runs a chosen item', async () => {
        const actionFn = vi.fn();
        render(target({actionFn}));

        fireEvent.contextMenu(screen.getByTestId('target'), {clientX: 40, clientY: 50});
        fireEvent.click(await screen.findByTestId('copy'));

        await waitFor(() => expect(actionFn).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByTestId('copy')).toBeNull());
    });

    it('closes on Escape', async () => {
        render(target());
        fireEvent.contextMenu(screen.getByTestId('target'));
        const item = await screen.findByTestId('copy');

        fireEvent.keyDown(item, {key: 'Escape'});
        await waitFor(() => expect(screen.queryByTestId('copy')).toBeNull());
    });

    it('closes on a right-click outside it, without the browser menu', async () => {
        render(target());
        fireEvent.contextMenu(screen.getByTestId('target'));
        await screen.findByTestId('copy');

        const backdrop = document.querySelector('.xh-context-menu__backdrop'),
            allowed = fireEvent.contextMenu(backdrop);

        expect(allowed).toBe(false); // The default was prevented.
        await waitFor(() => expect(screen.queryByTestId('copy')).toBeNull());
    });
});
