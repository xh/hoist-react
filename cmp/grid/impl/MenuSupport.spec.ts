/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {GetMainMenuItemsParams, MenuItemDef} from '@xh/hoist/kit/ag-grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {getAgGridMenuItems} from './MenuSupport';

/**
 * Resolution of grid menu tokens into ag-Grid menu items, for the column header context menu.
 * Header items act on the clicked column with no row in context, so the row-specific guards and
 * the per-column hiding rules are what apps rely on when they configure `headerContextMenu`.
 */
describe('Grid header context menu', () => {
    beforeAll(() => initTestAppAsync());

    it('builds the default items for a clicked column', () => {
        const gridModel = createGridModel(),
            items = headerItems(gridModel, 'pnl');

        expect(texts(items)).toEqual([
            'Sort Ascending',
            'Sort Descending',
            'separator',
            'Pin Column',
            'Hide Column',
            'Autosize Column',
            'separator',
            'Restore Grid Defaults',
            'separator',
            'Autosize Columns'
        ]);
    });

    it('hides the clicked-column items over a column group header', () => {
        const gridModel = createGridModel(),
            items = headerItems(gridModel, null);

        expect(texts(items)).toEqual(['Restore Grid Defaults', 'separator', 'Autosize Columns']);
    });

    it('offers the column chooser only when the grid has one', () => {
        expect(texts(headerItems(createGridModel(), 'pnl'))).not.toContain('Columns...');
        expect(texts(headerItems(createGridModel({colChooserModel: true}), 'pnl'))).toContain(
            'Columns...'
        );
    });

    it('sorts by the clicked column, preferring its absolute-value sort', () => {
        const gridModel = createGridModel(),
            items = headerItems(gridModel, 'pnl');

        action(items, 'Sort Descending')();
        expect(gridModel.sortBy.map(it => it.toString())).toEqual(['pnl|desc|abs']);

        action(items, 'Sort Ascending')();
        expect(gridModel.sortBy.map(it => it.toString())).toEqual(['pnl|asc']);
    });

    it('hides the sort items for a column that is not sortable', () => {
        const gridModel = createGridModel({
                columns: [{field: 'name'}, {field: 'region', sortable: false}]
            }),
            items = headerItems(gridModel, 'region');

        expect(texts(items)).not.toContain('Sort Ascending');
        expect(texts(items)).not.toContain('Sort Descending');
    });

    it('pins and unpins the clicked column', () => {
        const gridModel = createGridModel();

        let pin = subMenu(headerItems(gridModel, 'pnl'), 'Pin Column');
        expect(texts(pin)).toEqual(['Left', 'Right']);

        action(pin, 'Left')();
        expect(gridModel.getColumnPinned('pnl')).toBe('left');

        pin = subMenu(headerItems(gridModel, 'pnl'), 'Pin Column');
        expect(texts(pin)).toEqual(['Left', 'Right', 'Unpin']);

        action(pin, 'Unpin')();
        expect(gridModel.getColumnPinned('pnl')).toBeNull();
    });

    it('omits the pin item when column pinning is disabled', () => {
        const gridModel = createGridModel({enableColumnPinning: false});
        expect(texts(headerItems(gridModel, 'pnl'))).not.toContain('Pin Column');
    });

    it('hides the clicked column, unless it is not hideable', () => {
        const gridModel = createGridModel({
            columns: [{field: 'name', hideable: false}, {field: 'region'}]
        });

        expect(texts(headerItems(gridModel, 'name'))).not.toContain('Hide Column');

        action(headerItems(gridModel, 'region'), 'Hide Column')();
        expect(gridModel.isColumnVisible('region')).toBe(false);
    });

    it('shows no header menu when configured false', () => {
        const gridModel = createGridModel({headerContextMenu: false});
        expect(gridModel.headerContextMenu).toEqual([]);
    });

    it('passes the clicked column to a header menu function', () => {
        const gridModel = createGridModel({
                headerContextMenu: (params, model) => [
                    {text: `Column ${params.column.getColId()} of ${model.columns.length}`}
                ]
            }),
            items = headerItems(gridModel, 'pnl');

        expect(texts(items)).toEqual(['Column pnl of 3']);
    });
});

//------------------------
// Helpers
//------------------------
function createGridModel(config: GridConfig = {}): GridModel {
    const ret = new GridModel({
        columns: [{field: 'name'}, {field: 'region'}, {field: 'pnl', absSort: true}],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Items for a right-click on the header of `colId`, or on a column group header when null. */
function headerItems(gridModel: GridModel, colId: string): Array<string | MenuItemDef> {
    const params = {
        column: colId ? {getColId: () => colId} : null,
        columnGroup: null,
        defaultItems: []
    } as unknown as GetMainMenuItemsParams;
    return getAgGridMenuItems(params, gridModel, gridModel.headerContextMenu) ?? [];
}

function texts(items: Array<string | MenuItemDef>): string[] {
    return items.map(it => (typeof it === 'string' ? it : it.menuItemParams.displaySpec.text));
}

function item(items: Array<string | MenuItemDef>, text: string): MenuItemDef {
    const ret = items.find(it => typeof it !== 'string' && texts([it])[0] === text);
    expect(ret, `menu item '${text}'`).toBeDefined();
    return ret as MenuItemDef;
}

function action(items: Array<string | MenuItemDef>, text: string): () => void {
    return () => item(items, text).action(null);
}

function subMenu(items: Array<string | MenuItemDef>, text: string): Array<string | MenuItemDef> {
    return item(items, text).subMenu as Array<string | MenuItemDef>;
}
