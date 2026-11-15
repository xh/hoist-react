/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {treeMap, TreeMapModel} from '@xh/hoist/cmp/treemap';
import type {TreeMapConfig} from '@xh/hoist/cmp/treemap';
import type {PlainObject} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * TreeMap colors its nodes through the Highcharts color axis, which an app loads as a separate
 * module. Without it every node draws in one color and nothing else fails, so the component must
 * say so. jsdom has no layout, so these tests never create a real chart.
 */
describe('TreeMap', () => {
    beforeAll(() => initTestAppAsync());

    it('renders its chart holder on first render for a store with records, not a placeholder', () => {
        installFakeHighcharts({ColorAxis: class {}});
        const {container} = render(treeMap({model: createModel()}));

        expect(container.querySelector('.xh-treemap__chart-holder')).not.toBeNull();
        expect(container.querySelector('.xh-placeholder')).toBeNull();
    });

    describe('color axis warning', () => {
        it('says nothing when Highcharts has a color axis', () => {
            installFakeHighcharts({ColorAxis: class {}});
            const warn = spyOnWarn();
            render(treeMap({model: createModel()}));

            expect(colorAxisWarnings(warn)).toHaveLength(0);
        });

        it('says nothing for a colorMode of none, which needs no heat colors', () => {
            installFakeHighcharts();
            const warn = spyOnWarn();
            render(treeMap({model: createModel({colorMode: 'none'})}));

            expect(colorAxisWarnings(warn)).toHaveLength(0);
        });

        it('warns once, with the module to import, when it colors by heat with no color axis', () => {
            installFakeHighcharts();
            const warn = spyOnWarn();
            render(treeMap({model: createModel()}));
            render(treeMap({model: createModel({colorMode: 'wash'})}));

            const warnings = colorAxisWarnings(warn);
            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('highcharts/modules/heatmap');
        });
    });
});

/** Stands in for the app's Highcharts, with or without the parts a module adds. */
function installFakeHighcharts(extras: PlainObject = {}) {
    installHighcharts({version: '12.4.0', setOptions: () => {}, chart: vi.fn(), ...extras});
}

function createModel(config?: TreeMapConfig): TreeMapModel {
    const store = new Store({fields: ['name', 'value', 'heat']});
    store.loadData([
        {id: 1, name: 'A', value: 10, heat: 1},
        {id: 2, name: 'B', value: 5, heat: -1}
    ]);
    return new TreeMapModel({store, heatField: 'heat', ...config});
}

function spyOnWarn() {
    return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

function colorAxisWarnings(warn: ReturnType<typeof spyOnWarn>): string[] {
    return warn.mock.calls.map(args => args.join(' ')).filter(it => it.includes('color axis'));
}
