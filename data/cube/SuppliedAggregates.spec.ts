/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {
    Cube,
    type FilterLike,
    type QueryConfig,
    type SuppliedAggregate,
    type View,
    type ViewRowData
} from '@xh/hoist/data';
import {autorun} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Aggregates supplied to a Cube for measures only the data source can roll up, such as VaR. Group
 * rows read them by the dimension values that define the group, so one supplied value serves every
 * View that reaches the same group, in any grouping order. A value that lands on the wrong row,
 * or goes stale, shows a wrong risk number with nothing to flag it.
 */
describe('Cube supplied aggregates', () => {
    beforeAll(() => initTestAppAsync());

    it('fills each group row with the value supplied for its dimension values', async () => {
        const cube = createCube(),
            view = connectView(cube);

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        expect(rowAt(view).var95).toBe(100);
        expect(rowAt(view, 'US').var95).toBe(60);
        expect(rowAt(view, 'US', 'Tech').var95).toBe(45);
        expect(rowAt(view, 'EU', 'Tech').var95).toBe(30);
    });

    it('reuses values for the same groups when the grouping order changes', async () => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['sector', 'region'], includeRoot: true});

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        expect(rowAt(view, 'Tech').var95).toBe(70);
        expect(rowAt(view, 'Tech', 'US').var95).toBe(45);
        expect(rowAt(view, 'Energy').var95).toBeNull();
    });

    it('leaves leaf rows with their own values', async () => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['region'], includeLeaves: true});

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        const us = view.result.rows.find(it => it.cubeLabel === 'US');
        expect(us.children.map(it => it.var95)).toEqual([25, 30, 15]);
    });

    it('fills in values that arrive after the rows, and pushes them to connected stores', async () => {
        const cube = createCube(),
            view = connectView(cube),
            store = view.createStore({connect: true});
        onTestFinished(() => view.disconnectStore(store));
        await cube.loadDataAsync(POSITIONS);
        expect(rowAt(view, 'US').var95).toBeNull();

        await cube.updateAggregatesAsync([{dims: {region: 'US'}, values: {var95: 60}}]);

        expect(rowAt(view, 'US').var95).toBe(60);
        expect(store.getById(rowAt(view, 'US').id).data.var95).toBe(60);
    });

    it('merges updated values by field, keeping the others', async () => {
        const cube = createCube(),
            view = connectView(cube);
        await cube.loadDataAsync(POSITIONS, {}, [
            {dims: {region: 'US'}, values: {var95: 60, retYtd: 0.05}}
        ]);

        await cube.updateAggregatesAsync([{dims: {region: 'US'}, values: {var95: 65}}]);

        expect(rowAt(view, 'US')).toMatchObject({var95: 65, retYtd: 0.05});
    });

    it('keeps values through a leaf update applied in place', async () => {
        const cube = createCube(),
            view = connectView(cube);
        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        await cube.updateDataAsync([{...POSITIONS[0], mktVal: 999}]);

        expect(view.diagnostics.update.last.type).toBe('dataOnly');
        expect(rowAt(view, 'US', 'Tech').var95).toBe(45);
    });

    it('applies values sent with a data update along with the rows', async () => {
        const cube = createCube(),
            view = connectView(cube);
        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        await cube.updateDataAsync([{...POSITIONS[0], mktVal: 999}], {}, [
            {dims: {region: 'US', sector: 'Tech'}, values: {var95: 48}}
        ]);

        expect(rowAt(view, 'US', 'Tech')).toMatchObject({mktVal: 1019, var95: 48});
    });

    it('changes an observed result only inside an action, on a load and on an update', async () => {
        const cube = createCube(),
            view = connectView(cube),
            results = [];
        // Observed, so MobX's strict mode flags a change outside an action, which fails the test.
        const dispose = autorun(() => results.push(view.result));
        onTestFinished(dispose);

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);
        await cube.updateDataAsync([], {}, [
            {dims: {region: 'US', sector: 'Tech'}, values: {var95: 48}}
        ]);

        expect(rowAt(view, 'US', 'Tech').var95).toBe(48);
        expect(results.length).toBeGreaterThan(1);
    });

    it('replaces all values on a load, clearing them when none are given', async () => {
        const cube = createCube(),
            view = connectView(cube);
        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        await cube.loadDataAsync(POSITIONS, {}, [{dims: {}, values: {var95: 90}}]);
        expect(rowAt(view).var95).toBe(90);
        expect(rowAt(view, 'US').var95).toBeNull();

        await cube.loadDataAsync(POSITIONS);
        expect(rowAt(view).var95).toBeNull();
    });

    it('matches dimension values parsed by their field type', async () => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['asOf']});

        await cube.loadDataAsync(POSITIONS, {}, [
            {dims: {asOf: '2026-11-17'}, values: {var95: 100}}
        ]);

        expect(view.result.rows[0]).toMatchObject({asOf: LocalDate.get('2026-11-17'), var95: 100});
    });

    it('fills group rows of a filtered View from values for the filter and group together', async () => {
        const cube = createCube(),
            view = connectView(cube, {
                dimensions: ['region'],
                includeRoot: true,
                filter: {field: 'sector', op: '=', value: 'Tech'}
            });

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        expect(rowAt(view).var95).toBe(70);
        expect(rowAt(view, 'US').var95).toBe(45);
    });
});

describe('View.suppliedGroupingSets', () => {
    beforeAll(() => initTestAppAsync());

    it('lists each grouping level, and the grand total when the query includes the root', () => {
        const view = connectView(createCube(), {
            dimensions: ['region', 'sector'],
            includeRoot: true
        });

        expect(view.suppliedGroupingSets).toEqual([[], ['region'], ['region', 'sector']]);
    });

    it('adds the dimensions of single-value equality filters to every set', () => {
        const view = connectView(createCube(), {
            dimensions: ['region'],
            includeRoot: true,
            filter: {
                op: 'AND',
                filters: [
                    {field: 'sector', op: '=', value: 'Tech'},
                    {field: 'asOf', op: '=', value: ['2026-11-17']}
                ]
            }
        });

        expect(view.suppliedGroupingSets).toEqual([
            ['asOf', 'sector'],
            ['asOf', 'region', 'sector']
        ]);
    });

    it.each<[string, FilterLike]>([
        ['a list of values', {field: 'sector', op: '=', value: ['Tech', 'Energy']}],
        ['an operator other than =', {field: 'sector', op: '!=', value: 'Tech'}],
        ['a filter on a measure', {field: 'mktVal', op: '=', value: 0}],
        [
            'an OR',
            {
                op: 'OR',
                filters: [
                    {field: 'sector', op: '=', value: 'Tech'},
                    {field: 'region', op: '=', value: 'US'}
                ]
            }
        ]
    ])('is null, and leaves group rows blank, for a filter with %s', async (_, filter) => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['region'], includeRoot: true, filter});

        await cube.loadDataAsync(POSITIONS, {}, AGGREGATES);

        expect(view.suppliedGroupingSets).toBeNull();
        expect(rowAt(view).var95).toBeNull();
    });
});

//------------------
// Test data
//------------------
const QUERY: QueryConfig = {dimensions: ['region', 'sector'], includeRoot: true};

const POSITIONS: PlainObject[] = [
    {id: 1, asOf: '2026-11-17', region: 'US', sector: 'Tech', mktVal: 10, var95: 25},
    {id: 2, asOf: '2026-11-17', region: 'US', sector: 'Tech', mktVal: 20, var95: 30},
    {id: 3, asOf: '2026-11-17', region: 'US', sector: 'Energy', mktVal: 5, var95: 15},
    {id: 4, asOf: '2026-11-17', region: 'EU', sector: 'Tech', mktVal: 8, var95: 30}
];

// Supplied values, deliberately unlike any sum of the leaves.
const AGGREGATES: SuppliedAggregate[] = [
    {dims: {}, values: {var95: 100}},
    {dims: {region: 'US'}, values: {var95: 60}},
    {dims: {region: 'EU'}, values: {var95: 30}},
    {dims: {region: 'US', sector: 'Tech'}, values: {var95: 45}},
    {dims: {region: 'US', sector: 'Energy'}, values: {var95: 15}},
    {dims: {region: 'EU', sector: 'Tech'}, values: {var95: 30}},
    {dims: {sector: 'Tech'}, values: {var95: 70}}
];

function createCube(): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'asOf', type: 'localDate', isDimension: true},
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'mktVal', type: 'number', aggregator: 'SUM'},
                {name: 'var95', type: 'number', aggregator: 'SUPPLIED'},
                {name: 'retYtd', type: 'number', aggregator: 'SUPPLIED'}
            ]
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
