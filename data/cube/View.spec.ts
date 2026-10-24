/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {
    Cube,
    getCubeLeaves,
    type QueryConfig,
    Store,
    type View,
    type ViewRowData
} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {castArray, pick, sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The rows a Cube View publishes for a query, and how a View responds to query changes. Grids bind
 * to these rows directly - tree columns render `cubeLabel`, row ids drive grid state, and apps
 * regroup and refilter a View on every user interaction.
 */
describe('View', () => {
    beforeAll(() => initTestAppAsync());

    describe('result', () => {
        it('nests a row for each dimension value, with an id encoding its path', () => {
            const view = createView(createCube(), {dimensions: ['region', 'sector']});

            const [us] = view.result.rows;
            expect(view.result.rows.map(it => it.id)).toEqual([
                'root>>region=[US]',
                'root>>region=[EU]',
                'root>>region=[Asia]'
            ]);
            expect(us).toMatchObject({
                cubeLabel: 'US',
                cubeDimension: 'region',
                cubeRowType: 'aggregate',
                isCubeLeaf: false,
                region: 'US',
                qty: 425
            });

            const [usTech] = us.children;
            expect(us.children.map(it => it.id)).toEqual([
                'root>>region=[US]>>sector=[Tech]',
                'root>>region=[US]>>sector=[Energy]',
                'root>>region=[US]>>sector=[Finance]'
            ]);
            expect(usTech).toMatchObject({
                cubeLabel: 'Tech',
                cubeDimension: 'sector',
                region: 'US',
                sector: 'Tech',
                qty: 150,
                children: null
            });
        });

        it('labels a row with the string form of its dimension value', () => {
            // Apps match the 'null' label to render a placeholder for rows grouping blank values.
            const cube = autoDestroy(
                new Cube({
                    fields: [
                        {name: 'region', isDimension: true},
                        {name: 'year', type: 'int', isDimension: true},
                        {name: 'qty', type: 'int', aggregator: 'SUM'}
                    ],
                    data: [
                        {id: 1, region: null, year: 2024, qty: 10},
                        {id: 2, region: 'US', year: 2025, qty: 20}
                    ]
                })
            );

            const [blank] = cube.executeQuery({dimensions: ['region']});
            expect(blank).toMatchObject({
                id: 'root>>region=[null]',
                cubeLabel: 'null',
                region: null
            });

            const [year] = cube.executeQuery({dimensions: ['year']});
            expect(year).toMatchObject({id: 'root>>year=[2024]', cubeLabel: '2024', year: 2024});
        });

        it('adds a grand total row when includeRoot is set', () => {
            const cube = createCube(),
                view = createView(cube, {dimensions: ['region'], includeRoot: true});

            expect(view.result.rows).toHaveLength(1);
            const [root] = view.result.rows;
            expect(root).toMatchObject({
                id: 'root',
                cubeLabel: 'Total',
                cubeDimension: 'Total',
                cubeRowType: 'aggregate',
                qty: 1115
            });
            expect(root.children.map(it => [it.id, it.qty])).toEqual([
                ['root>>region=[US]', 425],
                ['root>>region=[EU]', 500],
                ['root>>region=[Asia]', 190]
            ]);
        });

        it('aggregates only the leaves that pass the query filter', () => {
            const view = createView(createCube(), {
                dimensions: ['region'],
                includeRoot: true,
                filter: {field: 'qty', op: '>=', value: 100}
            });

            // No Asia trade passes, so no Asia row.
            const [root] = view.result.rows;
            expect(root.qty).toBe(720);
            expect(root.children.map(it => [it.cubeLabel, it.qty])).toEqual([
                ['US', 300],
                ['EU', 420]
            ]);
        });

        it('returns a grand total or bare leaves for a query with no dimensions', () => {
            // Guards ea15a5b62 (v87.0.0) - a refactor made queries with no dimensions throw.
            const cube = createCube();

            const [root] = cube.executeQuery({includeRoot: true});
            expect(root).toMatchObject({id: 'root', qty: 1115, children: null});

            const leaves = cube.executeQuery({includeLeaves: true});
            expect(leaves.map(it => it.id)).toEqual(TRADES.map(it => String(it.id)));

            expect(cube.executeQuery({})).toEqual([]);
        });
    });

    describe('leaves', () => {
        it('nests source records under the lowest rows when includeLeaves is set', () => {
            const view = createView(createCube(), {dimensions: ['region'], includeLeaves: true});

            const [us] = view.result.rows,
                [leaf] = us.children;
            expect(us.children.map(it => it.id)).toEqual(['1', '2', '3', '4']);
            expect(leaf).toMatchObject({
                cubeLabel: '1',
                cubeDimension: null,
                cubeRowType: 'leaf',
                isCubeLeaf: true,
                children: null,
                symbol: 'AAPL',
                qty: 100
            });

            // Keyed by the source record's own id, not the row's string id.
            expect(view.result.leafMap.get(1).data).toBe(leaf);
        });

        it('exposes leaves only via getCubeLeaves when provideLeaves is set', () => {
            const store = autoDestroy(new Store({fields: ['qty'], projectionOnly: true})),
                view = createView(
                    createCube(),
                    {dimensions: ['region', 'sector'], includeRoot: true, provideLeaves: true},
                    {stores: store}
                );

            const [root] = view.result.rows,
                [us] = root.children,
                [usTech] = us.children;
            expect(usTech.children).toBeNull();

            const leafIds = (row: ViewRowData) => castArray(getCubeLeaves(row)).map(it => it.id);
            expect(leafIds(usTech)).toEqual(['1', '2']);
            expect(leafIds(us)).toEqual(['1', '2', '3', '4']);
            expect(leafIds(root)).toHaveLength(10);

            // Apps resolve selected grid records back to their source leaves this way.
            const record = store.getById(usTech.id);
            expect(leafIds(record.raw as ViewRowData)).toEqual(['1', '2']);

            const aapl = view.result.leafMap.get(1).data;
            expect(aapl).toMatchObject({isCubeLeaf: true, symbol: 'AAPL', qty: 100});
            expect(getCubeLeaves(aapl)).toBe(aapl);
        });

        it('publishes no leaves by default', () => {
            // Since v87.0.0 - hidden leaves share the Cube's record data, which must not escape.
            const view = createView(createCube(), {dimensions: ['region']});

            expect(view.result.leafMap).toBeNull();
            expect(getCubeLeaves(view.result.rows[0])).toEqual([]);
        });
    });

    describe('updateQuery', () => {
        it('skips recomputing for an equivalent query', () => {
            const query: QueryConfig = {
                    dimensions: ['region', 'sector'],
                    fields: ['qty', 'price'],
                    filter: {field: 'region', op: '=', value: ['US', 'EU']}
                },
                view = createView(createCube(), query),
                {result} = view;

            // Apps typically rebuild their full query config and re-apply it on every change.
            view.updateQuery({
                dimensions: ['region', 'sector'],
                fields: ['price', 'qty'],
                filter: {field: 'region', op: '=', value: ['US', 'EU']}
            });
            expect(view.result).toBe(result);

            view.setFilter({field: 'region', op: '=', value: ['US', 'EU']});
            expect(view.result).toBe(result);
        });

        it('matches a fresh query after changes to grouping, filter, fields and options', () => {
            let query: QueryConfig = {dimensions: ['region', 'sector'], fields: ['qty', 'price']};
            const view = createView(createCube(), query);

            // One View carried through a typical session, reusing cached rows at each step.
            // Also guards v87.0.0 (#4551) - a regrouped View kept dropped dimensions as fields.
            const changes: Partial<QueryConfig>[] = [
                {dimensions: ['sector', 'region']},
                {dimensions: ['region']},
                {dimensions: ['region', 'symbol']},
                {filter: {field: 'sector', op: '!=', value: 'Energy'}},
                {filter: {field: 'sector', op: '=', value: 'Tech'}},
                {filter: null},
                {fields: ['qty']},
                {fields: ['qty', 'price']},
                {includeLeaves: true},
                {includeLeaves: false, provideLeaves: true},
                {includeRoot: true}
            ];
            for (const change of changes) {
                view.updateQuery(change);
                query = {...query, ...change};
                expectMatchesFreshQuery(view, query, JSON.stringify(change));
            }
        });

        it('keeps store records for rows that a change leaves untouched', () => {
            // Grids skip rebuilding these records, and keep their selection and expand state.
            const store = autoDestroy(new Store({fields: ['qty'], projectionOnly: true})),
                view = createView(
                    createCube(),
                    {dimensions: ['region', 'sector']},
                    {stores: store}
                ),
                before = new Map(store.allRecords.map(it => [it.id, it]));

            // Asia has no Energy trades, so none of its rows change.
            view.setFilter({field: 'sector', op: '!=', value: 'Energy'});

            const reused = store.allRecords.filter(it => it === before.get(it.id)).map(it => it.id);
            expect(reused.sort()).toEqual([
                'root>>region=[Asia]',
                'root>>region=[Asia]>>sector=[Finance]',
                'root>>region=[Asia]>>sector=[Tech]',
                'root>>region=[EU]>>sector=[Tech]',
                'root>>region=[US]>>sector=[Finance]',
                'root>>region=[US]>>sector=[Tech]'
            ]);
            expect(store.getById('root>>region=[US]').data.qty).toBe(225);
        });
    });
});

//------------------
// Test data
//------------------
const TRADES = [
    {id: 1, region: 'US', sector: 'Tech', symbol: 'AAPL', qty: 100, price: 190},
    {id: 2, region: 'US', sector: 'Tech', symbol: 'MSFT', qty: 50, price: 410},
    {id: 3, region: 'US', sector: 'Energy', symbol: 'XOM', qty: 200, price: 110},
    {id: 4, region: 'US', sector: 'Finance', symbol: 'JPM', qty: 75, price: 200},
    {id: 5, region: 'EU', sector: 'Tech', symbol: 'SAP', qty: 80, price: 180},
    {id: 6, region: 'EU', sector: 'Energy', symbol: 'SHEL', qty: 120, price: 30},
    {id: 7, region: 'EU', sector: 'Energy', symbol: 'BP', qty: 300, price: 6},
    {id: 8, region: 'Asia', sector: 'Tech', symbol: 'SONY', qty: 60, price: 90},
    {id: 9, region: 'Asia', sector: 'Finance', symbol: 'HSBC', qty: 40, price: 60},
    {id: 10, region: 'Asia', sector: 'Finance', symbol: 'MUFG', qty: 90, price: 10}
];

function createCube(): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'symbol', isDimension: true},
                {name: 'qty', type: 'int', aggregator: 'SUM'},
                {name: 'price', type: 'int', aggregator: 'AVG'}
            ],
            data: TRADES
        })
    );
}

function createView(cube: Cube, query: QueryConfig, opts: {stores?: Store} = {}): View {
    return autoDestroy(cube.createView({query, ...opts}));
}

function autoDestroy<T extends {destroy(): void}>(obj: T): T {
    onTestFinished(() => obj.destroy());
    return obj;
}

/** Assert a View's rows equal those of a View built from scratch for the same query. */
function expectMatchesFreshQuery(view: View, query: QueryConfig, message?: string) {
    const fresh = createView(view.cube, query);
    expect(view.fieldNames, message).toEqual(fresh.fieldNames);
    expect(normalizeRows(view.result.rows, view.fieldNames), message).toEqual(
        normalizeRows(fresh.result.rows, fresh.fieldNames)
    );
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
