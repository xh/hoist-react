/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {Cube, FirstAggregator, LastAggregator, type QueryConfig, type View} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * `LastAggregator` and `FirstAggregator` pick one value per group by a second, ordering field -
 * such as the latest price of each symbol. A pick from the wrong leaf shows a stale price as
 * current, with nothing to flag it.
 */
describe('LastAggregator and FirstAggregator', () => {
    beforeAll(() => initTestAppAsync());

    it('take the value of the latest and the earliest leaf by the order field', () => {
        const view = connectView(createCube());

        expect(values(view)).toEqual({
            Total: {last: 102, first: 100},
            AAPL: {last: 102, first: 100},
            MSFT: {last: 205, first: 200}
        });
    });

    it('skip leaves with no value or no order, and break ties by the first leaf met', () => {
        const view = connectView(
            createCube([
                ...PRICES,
                {id: 7, symbol: 'MSFT', date: null, price: 999},
                {id: 8, symbol: 'MSFT', date: '2026-09-01', price: 199}
            ])
        );

        // MSFT's latest price is null, and the undated 999 never counts. On 09-01 AAPL and MSFT tie,
        // and the first leaf met - AAPL's - wins the grand total.
        expect(values(view)).toMatchObject({
            Total: {first: 100},
            MSFT: {last: 205, first: 200}
        });
    });

    it('read the order field from the source record, so a query need not include it', () => {
        const view = connectView(createCube(), {
            dimensions: ['symbol'],
            fields: ['last', 'first'],
            includeRoot: true
        });

        expect(values(view).AAPL).toEqual({last: 102, first: 100});
    });

    it('follow updates to a value or to the order field', async () => {
        const cube = createCube(),
            view = connectView(cube);

        await cube.updateDataAsync(
            withPicks([
                {id: 2, symbol: 'AAPL', date: '2026-09-03', price: 110},
                {id: 4, symbol: 'MSFT', date: '2026-09-04', price: 210}
            ])
        );

        expect(values(view)).toMatchObject({
            Total: {last: 210},
            AAPL: {last: 110},
            MSFT: {last: 210, first: 205}
        });
    });

    it('require an order field', () => {
        expect(() => new LastAggregator({orderField: null})).toThrow('orderField');
        expect(() => new FirstAggregator({} as any)).toThrow('orderField');
    });
});

//------------------
// Test data
//------------------
const PRICES: PlainObject[] = [
    {id: 1, symbol: 'AAPL', date: '2026-09-01', price: 100},
    {id: 2, symbol: 'AAPL', date: '2026-09-03', price: 102},
    {id: 3, symbol: 'AAPL', date: '2026-09-02', price: 101},
    {id: 4, symbol: 'MSFT', date: '2026-09-01', price: 200},
    {id: 5, symbol: 'MSFT', date: '2026-09-03', price: null},
    {id: 6, symbol: 'MSFT', date: '2026-09-02', price: 205}
];

function createCube(data: PlainObject[] = PRICES): Cube {
    const cube = new Cube({
        fields: [
            {name: 'symbol', isDimension: true},
            {name: 'date', type: 'localDate'},
            {name: 'price', type: 'number'},
            {name: 'last', type: 'number', aggregator: new LastAggregator({orderField: 'date'})},
            {name: 'first', type: 'number', aggregator: new FirstAggregator({orderField: 'date'})}
        ],
        data: withPicks(data)
    });
    onTestFinished(() => cube.destroy());
    return cube;
}

function connectView(
    cube: Cube,
    query: QueryConfig = {dimensions: ['symbol'], includeRoot: true}
): View {
    const ret = cube.createView({query, connect: true});
    onTestFinished(() => ret.destroy());
    return ret;
}

// Each row with its price as the value both aggregators pick from.
function withPicks(rows: PlainObject[]): PlainObject[] {
    return rows.map(it => ({...it, last: it.price, first: it.price}));
}

// `{label: {last, first}}` for the grand total and each symbol.
function values(view: View): PlainObject {
    const ret = {},
        [root] = view.result.rows;
    [root, ...(root.children ?? [])].forEach(row => {
        ret[row.cubeLabel] = {last: row.last, first: row.first};
    });
    return ret;
}
