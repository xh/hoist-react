/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {Cube, type QueryConfig, Store, type View, type ViewRowData} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test';
import {pick, sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Live updates to a View connected to its Cube. A View applies value changes in place, adjusting
 * each ancestor's aggregates incrementally, and rebuilds for structural changes. Every test checks
 * the result against a fresh query - a full rebuild is the reference for every incremental path.
 * Value-only tests also confirm the update ran in place, so a silent fallback to a rebuild cannot
 * pass for success. Past bugs here left grid totals wrong until the next full reload.
 */
describe('View', () => {
    beforeAll(() => initTestAppAsync());

    describe('value updates', () => {
        it('nulls a SUM once its last value goes null', async () => {
            // Fixed in v87.0.0 (#4541) - the incremental SUM fell to 0, where a rebuild gives null.
            const cube = createCube([
                    trade(1, 'US', 'Tech', 3),
                    trade(2, 'US', 'Tech', -3),
                    trade(3, 'EU', 'Tech', 5)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([trade(1, 'US', 'Tech', null)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').sum).toBe(-3);

            await cube.updateDataAsync([trade(2, 'US', 'Tech', null)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').sum).toBeNull();
            expect(rowAt(view, 'US').sum).toBeNull();
            expect(rowAt(view).sum).toBe(5);
        });

        it('recomputes MIN and MAX when the extreme value goes null', async () => {
            // Fixed in v87.0.0 (99ed07733) - comparisons coerced null to 0, blanking both.
            const cube = createCube([
                    trade(1, 'US', 'Tech', 0),
                    trade(2, 'US', 'Tech', 5),
                    trade(3, 'EU', 'Tech', -3),
                    trade(4, 'EU', 'Tech', -1)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([
                trade(1, 'US', 'Tech', null),
                trade(4, 'EU', 'Tech', null)
            ]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').min).toBe(5);
            expect(rowAt(view, 'EU', 'Tech').max).toBe(-3);
            expect(rowAt(view)).toMatchObject({min: -3, max: 5});
        });

        it('restores a UNIQUE value once its children agree again', async () => {
            // Fixed in v86.0.0 (#4384) - a row stayed null for good once its children diverged.
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Tech', 1),
                    trade(3, 'EU', 'Tech', 1)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([trade(2, 'US', 'Tech', 2)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').unique).toBeNull();
            expect(rowAt(view).unique).toBeNull();

            await cube.updateDataAsync([trade(2, 'US', 'Tech', 1)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').unique).toBe(1);
            expect(rowAt(view).unique).toBe(1);
        });

        it('keeps AVG an average over all leaves as values change', async () => {
            // Since v88.0.0 (#4659), each row composes its average from state adjusted per leaf.
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Tech', 2),
                    trade(3, 'US', 'Tech', 3),
                    trade(4, 'EU', 'Tech', 10)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([trade(3, 'US', 'Tech', 6)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').avg).toBe(3);
            expect(rowAt(view).avg).toBe(4.75);

            await cube.updateDataAsync([trade(1, 'US', 'Tech', null)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech').avg).toBe(4);
            expect(rowAt(view).avg).toBe(6);
        });

        it('nulls SUM_STRICT and AVG_STRICT while any leaf beneath is null', async () => {
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Tech', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([trade(2, 'US', 'Tech', null)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US', 'Tech')).toMatchObject({sumStrict: null, avgStrict: null});
            expect(rowAt(view)).toMatchObject({sumStrict: null, avgStrict: null});
            expect(rowAt(view, 'EU')).toMatchObject({sumStrict: 6, avgStrict: 6});

            await cube.updateDataAsync([trade(2, 'US', 'Tech', 5)]);
            expectInPlaceUpdate(view);
            expect(rowAt(view)).toMatchObject({sumStrict: 12, avgStrict: 4});
        });

        it('applies edits made via modifyRecordsAsync', async () => {
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Tech', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                view = connectView(cube);

            await cube.modifyRecordsAsync({id: 1, sum: 10});
            expectInPlaceUpdate(view);
            expect(rowAt(view, 'US').sum).toBe(12);
            expect(rowAt(view).sum).toBe(18);
        });

        it('updates exposed leaf rows in place', async () => {
            const query = {...QUERY, includeLeaves: true},
                cube = createCube([trade(1, 'US', 'Tech', 1), trade(2, 'US', 'Tech', 2)]),
                view = connectView(cube, query),
                leaf = view.result.leafMap.get(1).data;

            await cube.updateDataAsync([trade(1, 'US', 'Tech', 7)]);
            expectInPlaceUpdate(view, query);
            expect(leaf.sum).toBe(7);
        });

        it('pushes changed rows to connected stores, keeping records for other rows', async () => {
            // Grids skip rebuilding these records, and keep their selection and expand state.
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Energy', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                store = autoDestroy(
                    new Store({fields: ['sum'], projectionOnly: true, loadRootAsSummary: true})
                ),
                view = autoDestroy(cube.createView({query: QUERY, stores: store, connect: true})),
                before = new Map(store.allRecords.map(it => [it.id, it]));

            await cube.updateDataAsync([trade(1, 'US', 'Tech', 4)]);
            expect(view.diagnostics.update.last.type).toBe('dataOnly');

            const reused = store.allRecords.filter(it => it === before.get(it.id)).map(it => it.id);
            expect(reused.sort()).toEqual([
                'root>>region=[EU]',
                'root>>region=[EU]>>sector=[Tech]',
                'root>>region=[US]>>sector=[Energy]'
            ]);
            expect(store.getById('root>>region=[US]>>sector=[Tech]').data.sum).toBe(4);
            expect(store.getById('root>>region=[US]').data.sum).toBe(6);

            expect(store.summaryRecords[0].data.sum).toBe(12);
        });
    });

    describe('structural updates', () => {
        it('moves a record to its new group when a dimension value changes', async () => {
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Energy', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync([trade(2, 'EU', 'Energy', 2)]);
            expectMatchesFresh(view);
            expect(rowAt(view, 'US', 'Energy')).toBeUndefined();
            expect(rowAt(view, 'EU', 'Energy').sum).toBe(2);
        });

        it('adds and drops rows as records are added and removed', async () => {
            const cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Energy', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                view = connectView(cube);

            await cube.updateDataAsync({add: [trade(4, 'Asia', 'Tech', 3)]});
            expectMatchesFresh(view);
            expect(rowAt(view, 'Asia').sum).toBe(3);

            await cube.updateDataAsync({remove: [3]});
            expectMatchesFresh(view);
            expect(rowAt(view, 'EU')).toBeUndefined();
            expect(rowAt(view).sum).toBe(6);
        });

        it('adds and drops records as updates move them across the filter', async () => {
            // E.g. a View of open positions only.
            const query: QueryConfig = {...QUERY, filter: {field: 'qty', op: '!=', value: 0}},
                cube = createCube([
                    trade(1, 'US', 'Tech', 1),
                    trade(2, 'US', 'Tech', 2),
                    trade(3, 'EU', 'Tech', 6)
                ]),
                view = connectView(cube, query);

            // An in-place update first, which the rebuilds below must then build on correctly.
            await cube.updateDataAsync([trade(1, 'US', 'Tech', 3)]);
            expectInPlaceUpdate(view, query);

            await cube.updateDataAsync([trade(3, 'EU', 'Tech', 0)]);
            expectMatchesFresh(view, query);
            expect(rowAt(view, 'EU')).toBeUndefined();

            await cube.updateDataAsync([trade(3, 'EU', 'Tech', 4)]);
            expectMatchesFresh(view, query);
            expect(rowAt(view, 'EU').sum).toBe(4);
            expect(rowAt(view).sum).toBe(9);
        });
    });

    describe('reloads', () => {
        it('leaves rows untouched when a reload brings no changes', async () => {
            // Fixed in v87.0.0 (#4561) - every reload regenerated all rows, e.g. on each poll.
            const data = [trade(1, 'US', 'Tech', 1), trade(2, 'EU', 'Tech', 2)],
                cube = createCube(data),
                view = connectView(cube),
                {result} = view;

            await cube.loadDataAsync(data.map(it => ({...it})));
            expect(view.diagnostics.update.last.type).toBe('unchanged');
            expect(view.result).toBe(result);

            await cube.loadDataAsync([trade(1, 'US', 'Tech', 5), trade(2, 'EU', 'Tech', 2)]);
            expectMatchesFresh(view);
            expect(rowAt(view).sum).toBe(7);
        });
    });
});

//------------------
// Test data
//------------------
// The default query - a grand total over two levels of grouping.
const QUERY: QueryConfig = {dimensions: ['region', 'sector'], includeRoot: true};

/** A trade, with its qty fed to one measure for each of the built-in aggregators. */
function trade(id: number, region: string, sector: string, qty: number): PlainObject {
    return {
        id,
        region,
        sector,
        qty,
        sum: qty,
        sumStrict: qty,
        avg: qty,
        avgStrict: qty,
        min: qty,
        max: qty,
        unique: qty
    };
}

function createCube(data: PlainObject[]): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'qty', type: 'int'},
                {name: 'sum', type: 'int', aggregator: 'SUM'},
                {name: 'sumStrict', type: 'int', aggregator: 'SUM_STRICT'},
                {name: 'avg', type: 'number', aggregator: 'AVG'},
                {name: 'avgStrict', type: 'number', aggregator: 'AVG_STRICT'},
                {name: 'min', type: 'int', aggregator: 'MIN'},
                {name: 'max', type: 'int', aggregator: 'MAX'},
                {name: 'unique', type: 'int', aggregator: 'UNIQUE'},
                {name: 'leafCount', type: 'int', aggregator: 'LEAF_COUNT'},
                {name: 'childCount', type: 'int', aggregator: 'CHILD_COUNT'}
            ],
            data
        })
    );
}

function connectView(cube: Cube, query: QueryConfig = QUERY): View {
    return autoDestroy(cube.createView({query, connect: true}));
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

/** Assert the View's rows equal those of a fresh query of the same Cube. */
function expectMatchesFresh(view: View, query: QueryConfig = QUERY) {
    expect(normalizeRows(view.result.rows, view.fieldNames)).toEqual(
        normalizeRows(view.cube.executeQuery(query), view.fieldNames)
    );
}

/** Assert the View applied its last update in place, and that its rows match a fresh query. */
function expectInPlaceUpdate(view: View, query: QueryConfig = QUERY) {
    // ViewDiagnostics is @internal - read only the path taken.
    expect(view.diagnostics.update.last.type).toBe('dataOnly');
    expectMatchesFresh(view, query);
}

/**
 * Project rows to plain objects for comparison. Rows cannot be compared directly - digests differ
 * from View to View, and leaf rows read their field values through prototype getters.
 */
function normalizeRows(rows: ViewRowData[], fieldNames: string[]): PlainObject[] {
    if (!rows) return null;
    return sortBy(rows, 'id').map(row => ({
        ...pick(row, ['id', 'cubeRowType', 'cubeLabel', 'cubeDimension', ...fieldNames]),
        children: normalizeRows(row.children, fieldNames)
    }));
}
