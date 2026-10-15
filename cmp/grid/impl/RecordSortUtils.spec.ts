/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnSpec, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
import type {StoreRecord} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * GridModel.getSortedRecords(), which reproduces a grid's rendered row order from its Store, with
 * no rendered grid required. Grid exports and GridFindField both read rows in this order, so it
 * must apply grouping, sorting and column sort options just as the grid does.
 */
describe('GridModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('getSortedRecords', () => {
        it('orders records by each sorter in turn', () => {
            const gridModel = createTradeGridModel({sortBy: ['region', 'pnl|desc']});

            expect(sortedIds(gridModel)).toEqual([4, 5, 2, 3, 1]);
        });

        it('orders records by group ahead of the sort, with ungrouped records last', () => {
            const gridModel = createTradeGridModel({groupBy: 'region', sortBy: 'pnl|desc'});

            expect(sortedIds(gridModel)).toEqual([5, 2, 3, 1, 4]);
        });

        it('orders groups by their string keys when grouped by a non-string field', () => {
            // Fixed in 87.1.1 (#4651) - grouping by a number threw, breaking grid exports.
            const gridModel = createTradeGridModel({groupBy: 'qty', sortBy: 'name'});

            // As in the rendered grid, '10' sorts ahead of '9'.
            expect(sortedIds(gridModel)).toEqual([2, 3, 1, 5, 4]);
        });

        it('sorts by absolute value for an abs sorter', () => {
            const gridModel = createTradeGridModel({sortBy: 'pnl|desc|abs'});

            expect(sortedIds(gridModel)).toEqual([3, 2, 5, 1, 4]);
        });

        it("keeps a column's sortToBottom values last in either direction", () => {
            const gridModel = createRatingGridModel({field: 'rating', sortToBottom: 'Unrated'});

            expect(sortedIds(gridModel)).toEqual([1, 3, 4, 2]);

            gridModel.setSortBy('rating|desc');
            expect(sortedIds(gridModel)).toEqual([4, 3, 1, 2]);
        });

        // Fixed in 89.0.0 - with no rendered grid, a record-based sortValue was ignored.
        it("sorts by a column's sortValue field before the grid is rendered", () => {
            const gridModel = createRatingGridModel({field: 'rating', sortValue: 'ratingRank'});

            expect(sortedIds(gridModel)).toEqual([2, 3, 4, 1]);
        });

        it('flattens tree grids depth-first, sorting within each level', () => {
            const gridModel = createTreeGridModel();

            expect(sortedIds(gridModel)).toEqual(['us', 'us-ny', 'us-ca', 'eu', 'eu-uk']);
        });

        it("leaves each record's children in Store order", () => {
            // Fixed in 87.0.0 (#4608) - GridFindField sorted the Store's own child arrays in place.
            const gridModel = createTreeGridModel(),
                {store} = gridModel;

            gridModel.getSortedRecords();
            expect(store.getById('us').children.map(it => it.id)).toEqual(['us-ca', 'us-ny']);
            expect(store.rootRecords.map(it => it.id)).toEqual(['eu', 'us']);
        });
    });
});

//------------------
// Helpers
//------------------
function createGridModel(config: GridConfig, data: PlainObject[]): GridModel {
    const ret = new GridModel({sizingMode: 'standard', ...config});
    ret.loadData(data);
    onTestFinished(() => ret.destroy());
    return ret;
}

function createTradeGridModel(config: GridConfig): GridModel {
    return createGridModel(
        {
            store: {fields: [{name: 'qty', type: 'int'}]},
            columns: [{field: 'name'}, {field: 'region'}, {field: 'pnl'}, {field: 'qty'}],
            ...config
        },
        [
            {id: 1, name: 'Ann', region: 'US', pnl: 50, qty: 9},
            {id: 2, name: 'Bob', region: 'EU', pnl: -200, qty: 10},
            {id: 3, name: 'Cid', region: 'US', pnl: 300, qty: 10},
            {id: 4, name: 'Dee', region: null, pnl: 10, qty: null},
            {id: 5, name: 'Eve', region: 'EU', pnl: 75, qty: 9}
        ]
    );
}

function createRatingGridModel(ratingCol: ColumnSpec): GridModel {
    return createGridModel(
        {
            store: {fields: [{name: 'ratingRank', type: 'int'}]},
            columns: [{field: 'name'}, ratingCol],
            sortBy: 'rating'
        },
        [
            {id: 1, name: 'Ann', rating: 'High', ratingRank: 3},
            {id: 2, name: 'Bob', rating: 'Unrated', ratingRank: 0},
            {id: 3, name: 'Cid', rating: 'Low', ratingRank: 1},
            {id: 4, name: 'Dee', rating: 'Medium', ratingRank: 2}
        ]
    );
}

function createTreeGridModel(): GridModel {
    const node = (id: string, pnl: number, children: PlainObject[] = []) => ({
        id,
        name: id,
        pnl,
        children
    });
    return createGridModel(
        {
            treeMode: true,
            columns: [{field: 'name', isTreeColumn: true}, {field: 'pnl'}],
            sortBy: 'pnl|desc'
        },
        [
            node('eu', 100, [node('eu-uk', 100)]),
            node('us', 500, [node('us-ca', 200), node('us-ny', 300)])
        ]
    );
}

function sortedIds(gridModel: GridModel): StoreRecord['id'][] {
    return gridModel.getSortedRecords().map(it => it.id);
}
