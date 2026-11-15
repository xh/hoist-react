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

    // Fixed in v91 - the first read waited for the debounce, so a TreeMap with records showed its
    // empty placeholder for a moment on every mount.
    describe('data', () => {
        const rows = [
            {name: 'A', value: 10, heat: 1},
            {name: 'B', value: 5, heat: -1}
        ];

        it('reads a store that has records at construction, with no delay', () => {
            const model = new TreeMapModel({store: createStore(rows)});

            expect(model.empty).toBe(false);
            expect(model.data.map(it => it.name)).toEqual(['A', 'B']);
        });

        it('reads records loaded after construction with no delay, while it has none to show', () => {
            const store = createStore([]),
                model = new TreeMapModel({store});
            expect(model.empty).toBe(true);

            store.loadData(rows.map((it, id) => ({id, ...it})));
            expect(model.data.map(it => it.name)).toEqual(['A', 'B']);
        });

        it('debounces a change to a map that shows data, and takes the last of several', async () => {
            vi.useFakeTimers();
            const store = createStore(rows),
                model = new TreeMapModel({store});

            store.loadData([{id: 0, name: 'C', value: 1, heat: 1}]);
            model.labelField = 'heat';
            expect(model.data.map(it => it.name)).toEqual(['A', 'B']);

            await vi.advanceTimersByTimeAsync(150);
            expect(model.data.map(it => it.name)).toEqual([1]);
        });

        it('drops a pending change when destroyed', async () => {
            vi.useFakeTimers();
            const store = createStore(rows),
                model = new TreeMapModel({store}),
                {data} = model;

            store.loadData([]);
            model.destroy();
            await vi.advanceTimersByTimeAsync(150);
            expect(model.data).toBe(data);
        });
    });

    describe('color values', () => {
        it('scales heat by the largest heat, with positive above 0.5 and negative below', () => {
            const colors = colorValues([
                {name: 'A', value: 10, heat: 4},
                {name: 'B', value: 10, heat: -2},
                {name: 'C', value: 10, heat: 0}
            ]);

            expect(colors).toEqual([1, 0.2, 0.6]);
        });

        // Fixed in v91 - a largest heat of zero left no scale, and every color value was NaN.
        it('draws every node neutral when all heats are zero', () => {
            const colors = colorValues([
                {name: 'A', value: 10, heat: 0},
                {name: 'B', value: -5, heat: 0}
            ]);

            expect(colors).toEqual([0.5, 0.5]);
        });

        it('draws every node neutral for a maxHeat of zero', () => {
            const colors = colorValues(
                [
                    {name: 'A', value: 10, heat: 3},
                    {name: 'B', value: 10, heat: -3}
                ],
                {maxHeat: 0}
            );

            expect(colors).toEqual([0.5, 0.5]);
        });

        it('draws a node with no heat neutral', () => {
            const colors = colorValues([
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

/** The color value of each node. */
function colorValues(data: PlainObject[], config?: TreeMapConfig): number[] {
    const model = new TreeMapModel({store: createStore(data), heatField: 'heat', ...config});
    return model.data.map(it => it.colorValue);
}
