/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TreeMapModel} from '@xh/hoist/cmp/treemap';
import type {TreeMapConfig} from '@xh/hoist/cmp/treemap';
import {Store} from '@xh/hoist/data';
import type {PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * TreeMapModel turns store records into the nodes that Highcharts draws, each with a color value
 * from 0 to 1. A color value that is not a number draws as an invalid color, so every set of heat
 * values must give a usable one.
 */
describe('TreeMapModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('color values', () => {
        it('scales heat by the largest heat, with positive above 0.5 and negative below', async () => {
            const colors = await colorValuesAsync([
                {name: 'A', value: 10, heat: 4},
                {name: 'B', value: 10, heat: -2},
                {name: 'C', value: 10, heat: 0}
            ]);

            expect(colors).toEqual([1, 0.2, 0.6]);
        });

        // Fixed in v91 - a largest heat of zero left no scale, and every color value was NaN.
        it('draws every node neutral when all heats are zero', async () => {
            const colors = await colorValuesAsync([
                {name: 'A', value: 10, heat: 0},
                {name: 'B', value: -5, heat: 0}
            ]);

            expect(colors).toEqual([0.5, 0.5]);
        });

        it('draws every node neutral for a maxHeat of zero', async () => {
            const colors = await colorValuesAsync(
                [
                    {name: 'A', value: 10, heat: 3},
                    {name: 'B', value: 10, heat: -3}
                ],
                {maxHeat: 0}
            );

            expect(colors).toEqual([0.5, 0.5]);
        });

        it('draws a node with no heat neutral', async () => {
            const colors = await colorValuesAsync([
                {name: 'A', value: 10, heat: null},
                {name: 'B', value: 10, heat: 2}
            ]);

            expect(colors).toEqual([0.5, 1]);
        });
    });
});

function createStore(data: PlainObject[]): Store {
    const ret = new Store({fields: ['name', 'value', 'heat']});
    ret.loadData(data.map((it, id) => ({id, ...it})));
    return ret;
}

/** The color value of each node, once the model has read its store. */
async function colorValuesAsync(data: PlainObject[], config?: TreeMapConfig): Promise<number[]> {
    vi.useFakeTimers();
    const model = new TreeMapModel({store: createStore(data), heatField: 'heat', ...config});
    await vi.advanceTimersByTimeAsync(150);
    return model.data.map(it => it.colorValue);
}
