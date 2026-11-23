/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {Cube, KeyedAggregator, type QueryConfig, type View, type ViewRowData} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * `KeyedAggregator` rolls up a value that belongs to a coarser key than the leaves carry it on,
 * such as a fund's NAV copied onto each of its positions. Summing it would count a fund once per
 * position, so a group shows it only where the group pins the key, and the grand total counts each
 * key once.
 */
describe('KeyedAggregator', () => {
    beforeAll(() => initTestAppAsync());

    it('shows the value on rows that pin the key, and totals each key once at the root', () => {
        const view = connectView(createCube(), {dimensions: ['fund', 'sector'], includeRoot: true});

        expect(navByPath(view)).toEqual({
            Total: 1800,
            A: 1000,
            'A/Energy': 1000,
            'A/Tech': 1000,
            B: 500,
            'B/Tech': 500,
            C: 300,
            'C/Energy': 300
        });
    });

    it('aggregates each row once in a bulk update, not once per changed position', async () => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['fund', 'sector'], includeRoot: true}),
            aggregate = vi.spyOn(KeyedAggregator.prototype, 'aggregate');
        onTestFinished(() => aggregate.mockRestore());

        await cube.updateDataAsync(POSITIONS.map(it => ({...it, nav: it.nav * 2})));

        // The root, three funds and four fund-sector rows, once each.
        expect(aggregate).toHaveBeenCalledTimes(8);
        expect(navByPath(view)).toMatchObject({Total: 3600, A: 2000, 'B/Tech': 1000});
    });

    it('leaves rows that do not pin the key blank', () => {
        const view = connectView(createCube(), {dimensions: ['sector', 'fund'], includeRoot: true});

        expect(navByPath(view)).toMatchObject({
            Total: 1800,
            Tech: null,
            Energy: null,
            'Tech/A': 1000,
            'Energy/C': 300
        });
    });

    it('takes a key the query filter pins, and totals only the keys a filter leaves', () => {
        const byFund = connectView(createCube(), {
                dimensions: ['sector'],
                includeRoot: true,
                filter: {field: 'fund', op: '=', value: 'A'}
            }),
            bySector = connectView(createCube(), {
                dimensions: ['fund'],
                includeRoot: true,
                filter: {field: 'sector', op: '=', value: 'Tech'}
            });

        expect(navByPath(byFund)).toEqual({Total: 1000, Energy: 1000, Tech: 1000});
        expect(navByPath(bySector)).toEqual({Total: 1500, A: 1000, B: 500});
    });

    describe('keyAttributes', () => {
        const byStyle = {keyAttributes: ['style']};

        it('totals rows grouped by key attributes once per key, as the root does', () => {
            const view = connectView(createCube(byStyle), {
                dimensions: ['style', 'fund'],
                includeRoot: true
            });

            expect(navByPath(view)).toEqual({
                Total: 1800,
                Growth: 1300,
                'Growth/A': 1000,
                'Growth/C': 300,
                Value: 500,
                'Value/B': 500
            });
        });

        it('leaves a row grouped by any other dimension null', () => {
            const view = connectView(createCube(byStyle), {
                dimensions: ['style', 'sector'],
                includeRoot: true
            });

            expect(navByPath(view)).toMatchObject({
                Growth: 1300,
                'Growth/Tech': null,
                'Growth/Energy': null
            });
        });

        it('totals only the keys a filter leaves, as the root does', () => {
            const view = connectView(createCube(byStyle), {
                dimensions: ['style'],
                includeRoot: true,
                filter: {field: 'sector', op: '=', value: 'Tech'}
            });

            expect(navByPath(view)).toEqual({Total: 1500, Growth: 1000, Value: 500});
        });

        it('leaves rows grouped by an attribute null without the option', () => {
            const view = connectView(createCube(), {dimensions: ['style'], includeRoot: true});

            expect(navByPath(view)).toEqual({Total: 1800, Growth: null, Value: null});
        });
    });

    it('follows an update to the value in place', async () => {
        const cube = createCube(),
            view = connectView(cube, {dimensions: ['fund'], includeRoot: true});

        await cube.updateDataAsync([position(3, 'B', 'Tech', 600), position(4, 'B', 'Tech', 600)]);

        expect(view.diagnostics.update.last.type).toBe('dataOnly');
        expect(navByPath(view)).toEqual({Total: 1900, A: 1000, B: 600, C: 300});
    });

    it('leaves the root blank without a rootAggregator', () => {
        const view = connectView(createCube({rootAggregator: null}), {
            dimensions: ['fund'],
            includeRoot: true
        });

        expect(navByPath(view)).toEqual({Total: null, A: 1000, B: 500, C: 300});
    });

    it.each([
        ['AVG', 600],
        ['MIN', 300],
        ['MAX', 1000]
    ] as const)('totals the keys at the root with %s', (rootAggregator, expected) => {
        const view = connectView(createCube({rootAggregator}), {
            dimensions: ['fund'],
            includeRoot: true
        });

        expect(navByPath(view).Total).toBe(expected);
    });
});

//------------------
// Test data
//------------------
const NAV = {A: 1000, B: 500, C: 300},
    STYLE = {A: 'Growth', B: 'Value', C: 'Growth'};

const POSITIONS = [
    position(1, 'A', 'Tech'),
    position(2, 'A', 'Energy'),
    position(3, 'B', 'Tech'),
    position(4, 'B', 'Tech'),
    position(5, 'C', 'Energy')
];

// A position, with its fund's NAV and style copied onto it as a join would.
function position(id: number, fund: string, sector: string, nav = NAV[fund]): PlainObject {
    return {id, fund, sector, style: STYLE[fund], nav};
}

function createCube(
    opts: ConstructorParameters<typeof KeyedAggregator>[0] | PlainObject = {}
): Cube {
    const cube = new Cube({
        fields: [
            {name: 'fund', isDimension: true},
            {name: 'sector', isDimension: true},
            {name: 'style', isDimension: true},
            {
                name: 'nav',
                type: 'number',
                aggregator: new KeyedAggregator({
                    keyFields: ['fund'],
                    rootAggregator: 'SUM',
                    ...opts
                })
            }
        ],
        data: POSITIONS
    });
    onTestFinished(() => cube.destroy());
    return cube;
}

function connectView(cube: Cube, query: QueryConfig): View {
    const ret = cube.createView({query, connect: true});
    onTestFinished(() => ret.destroy());
    return ret;
}

// NAV by the path of labels to each row, as 'Total', 'A' or 'A/Tech'.
function navByPath(view: View): PlainObject {
    const ret = {},
        walk = (rows: ViewRowData[], path: string[]) =>
            rows?.forEach(row => {
                if (row.isCubeLeaf) return;
                const label = row.cubeLabel === 'Total' ? [] : [...path, row.cubeLabel];
                ret[label.length ? label.join('/') : 'Total'] = row.nav;
                walk(row.children, label);
            });
    walk(view.result.rows, []);
    return ret;
}
