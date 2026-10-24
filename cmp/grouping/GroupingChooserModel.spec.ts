/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {type GroupingChooserConfig, GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The standard grouping control's model: its value, available dimensions, favorites, and their
 * persistence and binding to a grid. Persisted groupings and favorites outlive changes to an
 * app's dimensions, so the model must drop what no longer applies instead of breaking.
 */
describe('GroupingChooserModel', () => {
    beforeAll(() => initTestAppAsync());

    const dimensions = ['region', 'sector', 'trader'];

    describe('setDimensions', () => {
        it('drops dimensions that are no longer available from the value', () => {
            const model = create({dimensions, initialValue: ['region', 'sector']});

            model.setDimensions(['sector', 'trader']);

            expect(model.value).toEqual(['sector']);
        });

        it('falls back to the first dimension when none of the value remains', () => {
            const model = create({dimensions, initialValue: ['region']}),
                emptyModel = create({dimensions, initialValue: ['region'], allowEmpty: true});

            model.setDimensions(['sector', 'trader']);
            emptyModel.setDimensions(['sector', 'trader']);

            expect(model.value).toEqual(['sector']);
            expect(emptyModel.value).toEqual([]);
        });
    });

    describe('favorites', () => {
        it('adds a favorite once, and removes it by value', () => {
            const model = create({dimensions, initialValue: ['region']});

            model.addFavorite(['region', 'sector']);
            model.addFavorite(['region', 'sector']);
            model.addFavorite([]);
            expect(model.favorites).toEqual([['region', 'sector']]);

            model.removeFavorite(['region', 'sector']);
            expect(model.favorites).toEqual([]);
        });

        // Fixed in 89.0.0 - favorites were sorted by the first letter of their labels only.
        it('lists favorites in order of their labels', () => {
            const model = create({
                dimensions: ['region', 'sector', 'strategy'],
                initialValue: ['region'],
                initialFavorites: [['strategy'], ['sector'], ['region']]
            });

            expect(model.favoritesOptions.map(it => it.label)).toEqual([
                'Region',
                'Sector',
                'Strategy'
            ]);
        });
    });

    describe('bind', () => {
        it('syncs its value with the grid groupBy, in both directions', () => {
            const gridModel = createGridModel(),
                model = create({bind: gridModel, dimensions, initialValue: ['region']});

            expect(gridModel.groupBy).toEqual(['region']);

            model.setValue(['sector', 'trader']);
            expect(gridModel.groupBy).toEqual(['sector', 'trader']);

            gridModel.setGroupBy(['trader']);
            expect(model.value).toEqual(['trader']);
        });

        it('takes its dimensions from store fields flagged as dimensions by default', () => {
            const model = create({bind: createGridModel(), initialValue: ['region']});

            expect(model.dimensionNames).toEqual(['region', 'sector', 'trader']);
            expect(model.getDimDisplayName('trader')).toBe('Trader Name');
        });
    });

    describe('persistWith', () => {
        it('round-trips its value and favorites', () => {
            const store = new MemoryStore(),
                config = {dimensions, initialValue: ['region'], persistWith: store.options},
                model = create(config);

            model.setValue(['sector', 'region']);
            model.addFavorite(['trader']);

            expect(store.data).toEqual({
                groupingChooser: {value: ['sector', 'region'], favorites: [['trader']]}
            });

            const restored = create(config);
            expect(restored.value).toEqual(['sector', 'region']);
            expect(restored.favorites).toEqual([['trader']]);
        });

        it('ignores persisted state that names a dimension no longer available', () => {
            const store = new MemoryStore({
                    groupingChooser: {
                        value: ['region', 'desk'],
                        favorites: [['desk'], ['sector']]
                    }
                }),
                model = create({dimensions, initialValue: ['region'], persistWith: store.options});

            expect(model.value).toEqual(['region']);
            expect(model.favorites).toEqual([['sector']]);
        });

        it('persists favorites with their own options when given', () => {
            const valueStore = new MemoryStore(),
                favoritesStore = new MemoryStore(),
                model = create({
                    dimensions,
                    initialValue: ['region'],
                    persistWith: {...valueStore.options, persistFavorites: favoritesStore.options}
                });

            model.setValue(['sector']);
            model.addFavorite(['trader']);

            expect(valueStore.data).toEqual({groupingChooser: {value: ['sector']}});
            expect(favoritesStore.data).toEqual({groupingChooser: {favorites: [['trader']]}});
        });
    });
});

//------------------
// Helpers
//------------------
function create(config: GroupingChooserConfig): GroupingChooserModel {
    const ret = new GroupingChooserModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

function createGridModel(): GridModel {
    const ret = new GridModel({
        store: {
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'trader', displayName: 'Trader Name', isDimension: true},
                {name: 'pnl', type: 'number'}
            ]
        },
        columns: [{field: 'region'}, {field: 'sector'}, {field: 'trader'}, {field: 'pnl'}]
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** In-memory backing store, read and written via a CustomProvider with no write debounce. */
class MemoryStore {
    data: PlainObject;

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: data => (this.data = data), debounce: 0};
    }
}
