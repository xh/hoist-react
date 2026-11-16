/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * A toolbar with `enableOverflowMenu` hands its items to Blueprint's OverflowList, which requires
 * an array. React delivers a lone child as a bare element, not an array.
 *
 * jsdom has no layout, so OverflowList moves every item into the overflow menu. These tests
 * therefore check that each item renders exactly once, in the toolbar or in its menu, rather
 * than which items stay visible.
 */
describe('Toolbar', () => {
    beforeAll(() => initTestAppAsync());

    describe('with the overflow menu enabled', () => {
        // Crashed before 91.0.0 when given a single item.
        it('renders a single item', async () => {
            await renderWithMenuOpenAsync([button({text: 'Only'})]);

            expect(screen.getAllByText('Only')).toHaveLength(1);
        });

        it("renders '-' as a separator and collapses consecutive separators", async () => {
            await renderWithMenuOpenAsync([button({text: 'A'}), '-', '-', button({text: 'B'})]);

            expect(screen.getAllByText('A')).toHaveLength(1);
            expect(screen.getAllByText('B')).toHaveLength(1);
            expect(document.querySelectorAll('.xh-toolbar__separator')).toHaveLength(1);
        });
    });
});

/** Render a toolbar with its overflow menu open, so every item is in the document. */
async function renderWithMenuOpenAsync(items: ReactNode[]) {
    const {container} = render(toolbar({enableOverflowMenu: true, children: items}));
    const overflowButton = container.querySelector('.bp6-popover-target button');
    if (overflowButton) {
        fireEvent.click(overflowButton);
        await waitFor(() =>
            expect(document.querySelector('.xh-toolbar-overflow-popover')).not.toBeNull()
        );
    }
}
