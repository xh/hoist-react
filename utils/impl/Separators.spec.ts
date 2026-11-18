/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {menuDivider} from '@xh/hoist/kit/blueprint';
import {
    filterConsecutiveMenuSeparators,
    filterConsecutiveToolbarSeparators
} from '@xh/hoist/utils/impl';
import {describe, expect, it} from 'vitest';

/**
 * Separator cleanup for menus and toolbars. Grid context menus, desktop and mobile menus, the
 * ViewManager menu and toolbars all run these filters after hidden items are removed, so a
 * separator left leading, trailing or doubled shows up directly in the UI.
 */
describe('Separators', () => {
    describe('filterConsecutiveMenuSeparators', () => {
        it('removes leading, trailing and repeated separators', () => {
            const items = ['-', 'copy', '-', '-', 'export', '-'];

            expect(items.filter(filterConsecutiveMenuSeparators())).toEqual([
                'copy',
                '-',
                'export'
            ]);
        });

        it('removes every separator when no other items remain', () => {
            expect(['-', '-'].filter(filterConsecutiveMenuSeparators())).toEqual([]);
        });

        it("treats '-', ag-Grid's 'separator' and a menu divider as separators", () => {
            const items = ['copy', '-', 'separator', menuDivider(), 'export', menuDivider()];

            expect(items.filter(filterConsecutiveMenuSeparators())).toEqual([
                'copy',
                '-',
                'export'
            ]);
        });

        it('keeps a menu divider with a title, which renders a heading', () => {
            const heading = menuDivider({title: 'Export'}),
                items = [heading, 'csv', 'excel', '-'];

            expect(items.filter(filterConsecutiveMenuSeparators())).toEqual([
                heading,
                'csv',
                'excel'
            ]);
        });
    });

    describe('filterConsecutiveToolbarSeparators', () => {
        it("treats '-' and a ToolbarSeparator element as separators", () => {
            const sep = toolbarSep(),
                items = ['-', 'save', sep, '-', 'refresh', toolbarSep()];

            expect(items.filter(filterConsecutiveToolbarSeparators())).toEqual([
                'save',
                sep,
                'refresh'
            ]);
        });
    });
});
