/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {
    Cube,
    CubeField,
    type QueryConfig,
    SeriesSumAggregator,
    type View,
    type ViewRowData
} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * `SeriesSumAggregator` totals series values - such as each position's daily P&L over a window -
 * point by point. Series end on the same date, so they align from the end. A misaligned or
 * dropped point shifts a whole group's history, with nothing to flag it.
 */
describe('SeriesSumAggregator', () => {
    beforeAll(() => initTestAppAsync());

    it('sums series point by point, aligning them from the end', () => {
        const view = connectView(createCube());

        expect(seriesByPath(view)).toEqual({
            Total: [11, 34, 41],
            US: [11, 27, 33],
            'US/Tech': [11, 22, 33],
            'US/Energy': [null, 5, null],
            EU: [7, 8],
            'EU/Tech': [7, 8],
            'EU/Energy': null
        });
    });

    it('is the singleton behind the SERIES_SUM token', () => {
        expect(new CubeField({name: 'pnl', aggregator: 'SERIES_SUM'}).aggregator).toBeInstanceOf(
            SeriesSumAggregator
        );
    });

    it('follows a changed leaf in place, and a change of length in full', async () => {
        const cube = createCube(),
            view = connectView(cube);

        await cube.updateDataAsync([position(1, 'US', 'Tech', [2, 2, 3])]);
        expect(view.diagnostics.update.last.type).toBe('dataOnly');
        expect(seriesByPath(view)).toMatchObject({
            Total: [12, 34, 41],
            US: [12, 27, 33],
            'US/Tech': [12, 22, 33]
        });

        await cube.updateDataAsync([position(4, 'EU', 'Tech', [1, 1, 1])]);
        expect(seriesByPath(view)).toMatchObject({
            Total: [13, 28, 34],
            EU: [1, 1, 1],
            'EU/Tech': [1, 1, 1]
        });
        expect(seriesByPath(view)).toEqual(seriesByPath(connectView(cube)));
    });

    it('keeps a group series that did not change as the same array', async () => {
        const cube = createCube(),
            view = connectView(cube),
            before = seriesByPath(view);

        await cube.updateDataAsync([position(1, 'US', 'Tech', [2, 2, 3])]);

        expect(seriesByPath(view).EU).toBe(before.EU);
    });
});

//------------------
// Test data
//------------------
const QUERY: QueryConfig = {dimensions: ['region', 'sector'], includeRoot: true};

function position(id: number, region: string, sector: string, pnl: unknown): PlainObject {
    return {id, region, sector, pnl};
}

function createCube(): Cube {
    const cube = new Cube({
        fields: [
            {name: 'region', isDimension: true},
            {name: 'sector', isDimension: true},
            {name: 'pnl', type: 'auto', aggregator: 'SERIES_SUM'}
        ],
        data: [
            position(1, 'US', 'Tech', [1, 2, 3]),
            position(2, 'US', 'Tech', [10, 20, 30]),
            position(3, 'US', 'Energy', [null, 5, null]),
            position(4, 'EU', 'Tech', [7, 8]),
            position(5, 'EU', 'Energy', null),
            position(6, 'EU', 'Energy', [])
        ]
    });
    onTestFinished(() => cube.destroy());
    return cube;
}

function connectView(cube: Cube): View {
    const ret = cube.createView({query: QUERY, connect: true});
    onTestFinished(() => ret.destroy());
    return ret;
}

// The series of each group, by its path of labels: 'Total', 'US' or 'US/Tech'.
function seriesByPath(view: View): PlainObject {
    const ret = {},
        walk = (rows: ViewRowData[], path: string[]) =>
            rows?.forEach(row => {
                if (row.isCubeLeaf) return;
                const at = row.cubeLabel === 'Total' ? [] : [...path, row.cubeLabel];
                ret[at.length ? at.join('/') : 'Total'] = row.pnl;
                walk(row.children, at);
            });
    walk(view.result.rows, []);
    return ret;
}
