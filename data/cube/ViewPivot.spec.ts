/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {Cube, type QueryConfig, type View, type ViewRowData} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test';
import {pick, sortBy, sumBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A View whose query sets `pivot` slices each group row's aggregates across a second axis of
 * dimensions, publishing one synthetic field per (pivot path, value field) on the row. These tests
 * pin the contract a PivotGrid relies on: which fields appear and what they are named, that a row's
 * total equals the sum of its top-level cells, that ticks keep cells current in place, and that
 * structural changes rebuild rather than leave stale cells behind. Expected values are accumulated
 * directly from the trades, never through the View.
 */
describe('View', () => {
    beforeAll(() => initTestAppAsync());

    describe('pivot', () => {
        it('publishes a cell field per path and value field, with row totals on the bare name', () => {
            const view = pivotView(createCube(TRADES));

            expect(view.result.paths.map(p => p.label)).toEqual(['Energy', 'Tech']);
            expect(view.result.cellFields.map(cf => cf.name)).toEqual([
                'sum',
                'avg',
                'Energy>>sum',
                'Energy>>avg',
                'Tech>>sum',
                'Tech>>avg'
            ]);

            const us = rowAt(view, 'US');
            expect(us).toMatchObject({
                sum: 1 + 2 + 3,
                'Tech>>sum': 1 + 2,
                'Tech>>avg': 1.5,
                'Energy>>sum': 3
            });
            expect(rowAt(view)).toMatchObject({sum: 10, 'Tech>>sum': 7, 'Energy>>sum': 3});
        });

        it('gives every row a total equal to the sum of its top-level cells', () => {
            const view = pivotView(createCube(TRADES));

            [rowAt(view), ...rowAt(view).children].forEach(row => {
                expect(cellSum(view, row, 'sum')).toBe(row.sum);
            });
        });

        it('builds no cell where no leaf lands', () => {
            const view = pivotView(createCube(TRADES));

            // EU has no Energy trades - the slot is absent rather than zero.
            expect(rowAt(view, 'EU')).toMatchObject({sum: 4, 'Tech>>sum': 4});
            expect('Energy>>sum' in rowAt(view, 'EU')).toBe(false);
        });

        it('nests paths and subtotals for a second pivot dimension', () => {
            const view = pivotView(createCube(TRADES), {
                pivot: {dimensions: ['sector', 'book'], valueFields: ['sum']}
            });

            const [energy, tech] = view.result.paths;
            expect(tech.children.map(p => p.label)).toEqual(['A', 'B']);
            expect(energy.children.map(p => p.label)).toEqual(['A']);

            expect(rowAt(view, 'US')).toMatchObject({
                'Tech>>sum': 3,
                'Tech>>A>>sum': 1,
                'Tech>>B>>sum': 2,
                'Energy>>A>>sum': 3
            });
            expect(rowAt(view)).toMatchObject({
                'Tech>>sum': 7,
                'Tech>>A>>sum': 5,
                'Tech>>B>>sum': 2
            });
        });

        it('keeps blank pivot values as their own path unless excluded', () => {
            const trades = [...TRADES, trade(9, 'US', null, 'A', 100)],
                withBlank = pivotView(createCube(trades)),
                without = pivotView(createCube(trades), {
                    pivot: {
                        dimensions: ['sector'],
                        valueFields: ['sum'],
                        excludeEmptyPivotValues: true
                    }
                });

            const empty = withBlank.result.paths.find(p => p.isEmpty);
            expect(empty).toMatchObject({label: '(empty)', value: null});
            expect(rowAt(withBlank, 'US')[`${empty.key}>>sum`]).toBe(100);
            expect(rowAt(withBlank, 'US').sum).toBe(106);

            // Excluded records leave the group totals too, so totals still equal the sum of cells.
            expect(without.result.paths.some(p => p.isEmpty)).toBe(false);
            expect(rowAt(without, 'US').sum).toBe(6);
        });

        it('exposes a leaf with its own cell populated and every other path null', () => {
            const view = pivotView(createCube(TRADES), {includeLeaves: true}),
                leaf = rowAt(view, 'US').children.find(it => it.id === '1');

            expect(leaf).toMatchObject({sum: 1, 'Tech>>sum': 1, 'Energy>>sum': null});
        });

        it('updates cells in place on a value tick, through both aggregation routes', async () => {
            const cube = createCube(TRADES),
                view = pivotView(cube),
                pathsBefore = view.result.paths;

            await cube.updateDataAsync([trade(1, 'US', 'Tech', 'A', 11)]);

            expect(view.diagnostics.update.last.type).toBe('dataOnly');
            expect(rowAt(view, 'US')).toMatchObject({sum: 16, 'Tech>>sum': 13, 'Tech>>avg': 6.5});
            expect(rowAt(view)).toMatchObject({sum: 20, 'Tech>>sum': 17});
            expect(view.result.paths).toBe(pathsBefore);
            expectMatchesFresh(view);
        });

        it('rebuilds when a record moves to another pivot path, clearing the vacated cell', async () => {
            const cube = createCube(TRADES),
                view = pivotView(cube);

            // US's only Energy trade becomes a Tech trade.
            await cube.updateDataAsync([trade(3, 'US', 'Tech', 'A', 3)]);

            expect(view.diagnostics.update.last.type).toBe('fullUpdate');
            expect(rowAt(view, 'US')).toMatchObject({sum: 6, 'Tech>>sum': 6, 'Energy>>sum': null});
            expectMatchesFresh(view);
        });

        it('mints a new path when a record introduces a pivot value, replacing result.paths', async () => {
            const cube = createCube(TRADES),
                view = pivotView(cube),
                pathsBefore = view.result.paths;

            await cube.updateDataAsync([trade(1, 'US', 'Health', 'A', 1)]);

            expect(view.result.paths).not.toBe(pathsBefore);
            expect(view.result.paths.map(p => p.label)).toEqual(['Energy', 'Health', 'Tech']);
            expect(rowAt(view, 'US')).toMatchObject({'Health>>sum': 1, 'Tech>>sum': 2});
            expectMatchesFresh(view);
        });

        it('swaps value fields on updateQuery, keeping the path keys', () => {
            const view = pivotView(createCube(TRADES)),
                keysBefore = view.result.paths.map(p => p.key);

            view.updateQuery({pivot: {...view.query.pivot, valueFields: ['avg']}});

            expect(view.result.paths.map(p => p.key)).toEqual(keysBefore);
            expect(view.result.cellFields.map(cf => cf.name)).toEqual([
                'avg',
                'Energy>>avg',
                'Tech>>avg'
            ]);
            expect(rowAt(view, 'US')).toMatchObject({'Tech>>avg': 1.5, 'Energy>>avg': 3});
            expect('Tech>>sum' in rowAt(view, 'US')).toBe(false);
        });

        it('degenerates to a plain view with no pivot dimensions, and pivots again', () => {
            const view = pivotView(createCube(TRADES));

            view.updateQuery({pivot: {...view.query.pivot, dimensions: []}});
            expect(view.query.isPivoted).toBe(false);
            expect(view.result.paths).toEqual([]);
            expect(view.result.cellFields).toEqual([]);
            expect(rowAt(view, 'US')).toMatchObject({sum: 6, 'Tech>>sum': null});
            expectMatchesFresh(view, {
                ...QUERY,
                pivot: {dimensions: [], valueFields: ['sum', 'avg']}
            });

            view.updateQuery({pivot: {...view.query.pivot, dimensions: ['sector']}});
            expect(rowAt(view, 'US')).toMatchObject({'Tech>>sum': 3, 'Energy>>sum': 3});
            expectMatchesFresh(view);
        });

        it('creates a store with cell fields declared and kept current', async () => {
            const cube = createCube(TRADES),
                view = pivotView(cube),
                store = autoDestroy(view.createStore({connect: true}));

            expect(store.getField('Tech>>sum')).toBeTruthy();
            expect(store.getById('root>>region=[US]').data['Tech>>sum']).toBe(3);

            await cube.updateDataAsync([trade(1, 'US', 'Tech', 'A', 11)]);
            expect(store.getById('root>>region=[US]').data['Tech>>sum']).toBe(13);

            await cube.updateDataAsync([trade(1, 'US', 'Health', 'A', 1)]);
            expect(store.getField('Health>>sum')).toBeTruthy();
            expect(store.getById('root>>region=[US]').data['Health>>sum']).toBe(1);
        });

        it('rejects a value field without an aggregator or shared with a grouping dimension', () => {
            const cube = createCube(TRADES);

            expect(() =>
                cube.createView({
                    query: {...QUERY, pivot: {dimensions: ['sector'], valueFields: ['qty']}}
                })
            ).toThrow('must specify an aggregator');
            expect(() =>
                cube.createView({
                    query: {...QUERY, pivot: {dimensions: ['region'], valueFields: ['sum']}}
                })
            ).toThrow('cannot be both a grouping and a pivot dimension');
        });
    });
});

//------------------
// Test data
//------------------
const QUERY: QueryConfig = {
    dimensions: ['region'],
    includeRoot: true,
    omitRedundantNodes: false,
    pivot: {dimensions: ['sector'], valueFields: ['sum', 'avg']}
};

/** Two regions, two sectors, two books. EU has no Energy trades. */
const TRADES = [
    trade(1, 'US', 'Tech', 'A', 1),
    trade(2, 'US', 'Tech', 'B', 2),
    trade(3, 'US', 'Energy', 'A', 3),
    trade(4, 'EU', 'Tech', 'A', 4)
];

function trade(id: number, region: string, sector: string, book: string, qty: number): PlainObject {
    return {id, region, sector, book, qty, sum: qty, avg: qty};
}

function createCube(data: PlainObject[]): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'book', isDimension: true},
                {name: 'qty', type: 'int'},
                {name: 'sum', type: 'int', aggregator: 'SUM'},
                {name: 'avg', type: 'number', aggregator: 'AVG'}
            ],
            data
        })
    );
}

function pivotView(cube: Cube, overrides: Partial<QueryConfig> = {}): View {
    return autoDestroy(cube.createView({query: {...QUERY, ...overrides}, connect: true}));
}

function autoDestroy<T extends {destroy(): void}>(obj: T): T {
    onTestFinished(() => obj.destroy());
    return obj;
}

/** The row at a path of dimension labels below the grand total - the total itself if none. */
function rowAt(view: View, ...labels: string[]): ViewRowData {
    let [row] = view.result.rows;
    for (const label of labels) row = row?.children?.find(it => it.cubeLabel === label);
    return row;
}

/** Sum of a row's top-level cells for one value field - absent cells count as nothing. */
function cellSum(view: View, row: ViewRowData, valueField: string): number {
    return sumBy(view.result.paths, p => row[`${p.key}>>${valueField}`] ?? 0);
}

/** Assert the View's rows, cells included, equal those of a fresh query of the same Cube. */
function expectMatchesFresh(view: View, query: QueryConfig = QUERY) {
    const names = [...view.fieldNames, ...view.result.cellFields.map(cf => cf.name)];
    expect(normalizeRows(view.result.rows, names)).toEqual(
        normalizeRows(view.cube.executeQuery(query), names)
    );
}

function normalizeRows(rows: ViewRowData[], fieldNames: string[]): PlainObject[] {
    if (!rows) return null;
    return sortBy(rows, 'id').map(row => ({
        ...pick(row, ['id', 'cubeRowType', 'cubeLabel', ...fieldNames]),
        children: normalizeRows(row.children, fieldNames)
    }));
}
