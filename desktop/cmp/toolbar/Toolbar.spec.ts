/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {button} from '@xh/hoist/desktop/cmp/button';
import {Toolbar, toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How a toolbar with `enableOverflowMenu` moves items that do not fit into a menu. The overflow
 * list requires an array, while React delivers a lone child as a bare element.
 *
 * jsdom has no layout. Unless a test simulates one, the overflow list moves every item into the
 * menu, so those tests check only that each item renders exactly once, in the toolbar or its menu.
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
            expect(screen.getAllByRole('separator')).toHaveLength(1);
        });
    });
});

describe.each([
    ['Hoist', false],
    ['Blueprint', true]
])('Toolbar overflow with simulated layout (%s)', (_name, useBlueprint) => {
    beforeAll(() => initTestAppAsync());

    const items = ['A', 'B', 'C', 'D', 'E', 'F'].map(text => button({text}));

    it('shows every item, with no menu, when all fit', () => {
        renderWithRoom(6, {}, useBlueprint);
        expect(visibleItems()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        expect(
            document.querySelector('.xh-toolbar-overflow-popover, .bp6-popover-target')
        ).toBeNull();
    });

    it('moves items from the end into the menu when there is room for some', async () => {
        renderWithRoom(3, {}, useBlueprint);
        expect(visibleItems()).toEqual(['A', 'B', 'C']);
        expect(await menuItems()).toEqual(['D', 'E', 'F']);
    });

    it('moves items from the start when collapseFrom is start', async () => {
        renderWithRoom(4, {collapseFrom: 'start'}, useBlueprint);
        expect(visibleItems()).toEqual(['C', 'D', 'E', 'F']);
        expect(await menuItems()).toEqual(['A', 'B']);
    });

    it('keeps minVisibleItems visible, however little room there is', () => {
        renderWithRoom(1, {minVisibleItems: 4}, useBlueprint);
        expect(visibleItems()).toEqual(['A', 'B', 'C', 'D']);
    });

    /**
     * Render the toolbar with room for `room` items. The spacer that ends the overflow list
     * reports a width only while no more than that many items are visible beside it.
     */
    function renderWithRoom(room: number, props: object, useBlueprint: boolean) {
        Toolbar.defaults.useBlueprint = useBlueprint;
        const spy = vi
            .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
            .mockImplementation(function (this: HTMLElement) {
                if (!this.classList.contains('bp6-overflow-list-spacer')) return 0;
                const count = this.parentElement.querySelectorAll(':scope > .xh-button').length;
                return count <= room ? 10 : 0;
            });
        onTestFinished(() => {
            spy.mockRestore();
            Toolbar.defaults.useBlueprint = false;
        });
        render(toolbar({enableOverflowMenu: true, children: items, ...props}));
    }

    function visibleItems(): string[] {
        const list = document.querySelector('.bp6-overflow-list');
        return Array.from(list.querySelectorAll(':scope > .xh-button')).map(it => it.textContent);
    }

    async function menuItems(): Promise<string[]> {
        fireEvent.click(document.querySelector('.bp6-popover-target button'));
        const menu = await waitFor(() => {
            const ret = document.querySelector('.xh-toolbar-overflow-popover');
            expect(ret).not.toBeNull();
            return ret;
        });
        return Array.from(menu.querySelectorAll('.xh-button')).map(it => it.textContent);
    }
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
