/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    type FilterChooserConfig,
    type FilterChooserFieldSpecConfig,
    FilterChooserModel
} from '@xh/hoist/cmp/filter';
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import {
    CompoundFilter,
    type FieldFilterSpec,
    type FilterLike,
    parseFilter,
    Store
} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The typeahead filter control's model: parsing what the user types into suggested filters,
 * combining the selected tags into one filter, and syncing that filter with a bound Store. It is
 * a primary search UI in data-heavy apps, and its query parsing and filter composition are the
 * most intricate logic behind any Hoist input.
 */
describe('FilterChooserModel', () => {
    beforeAll(() => initTestAppAsync());

    const fieldSpecs: FilterChooserFieldSpecConfig[] = [
        {field: 'region', fieldType: 'string', values: ['US', 'UK', 'Russia']},
        {field: 'name', fieldType: 'string'},
        {field: 'price', fieldType: 'number'}
    ];

    describe('queryAsync', () => {
        // Longer operators win over their prefixes, and fields and operators match in any case.
        it.each([
            ['Price > 100', {field: 'price', op: '>', value: 100}],
            ['Price >= 100', {field: 'price', op: '>=', value: 100}],
            ['price != 5', {field: 'price', op: '!=', value: 5}],
            ['Name like smi', {field: 'name', op: 'like', value: 'smi'}],
            ['Name NOT LIKE smi', {field: 'name', op: 'not like', value: 'smi'}],
            ['Name begins Sm', {field: 'name', op: 'begins', value: 'Sm'}]
        ])('suggests a filter for "%s"', async (query, expected) => {
            const model = create({fieldSpecs}),
                options = await model.queryAsync(query);

            expect(options.map(it => it.filter?.toJSON())).toEqual([expected]);
        });

        // BUG: QueryEngine.ts:295 - the query is split on every operator it contains, and only
        // the first three parts are kept, so the value is cut off at its first operator.
        it.fails('keeps operator words and symbols that appear within the value', async () => {
            const model = create({fieldSpecs}),
                [option] = await model.queryAsync('Name = This Is Us');

            expect(option.filter.toJSON()).toEqual({field: 'name', op: '=', value: 'This Is Us'});
        });

        it('suggests values that match the query at the start of a word', async () => {
            const model = create({fieldSpecs}),
                options = await model.queryAsync('us');

            expect(labels(options)).toEqual(['Region = US']);
        });

        it('offers a typed value as a filter only when not forcing selection', async () => {
            const model = create({fieldSpecs}),
                forced = create({fieldSpecs: [{...fieldSpecs[0], forceSelection: true}]});

            expect(labels(await model.queryAsync('Region = Fr'))).toEqual(['Region = Fr']);
            expect(labels(await forced.queryAsync('Region = Fr'))).toEqual(['No matches found']);
        });

        it('suggests blank and not-blank filters for the "is" operator', async () => {
            const model = create({fieldSpecs});

            expect(labels(await model.queryAsync('Region is '))).toEqual([
                'Region is blank',
                'Region is not blank'
            ]);
            expect(labels(await model.queryAsync('Region is n'))).toEqual(['Region is not blank']);
        });

        it('suggests values from its source store as the store data changes', async () => {
            vi.useFakeTimers();
            const store = createStore([{id: 1, region: 'US'}]),
                model = create({valueSource: store, fieldSpecs: ['region']});
            await vi.advanceTimersByTimeAsync(100);

            expect(labels(await model.queryAsync('Region ='))).toEqual(['Region = US']);

            store.loadData([{id: 2, region: 'JP'}]);
            await vi.advanceTimersByTimeAsync(100);

            expect(labels(await model.queryAsync('Region ='))).toEqual(['Region = JP']);
        });

        // v82.0.4 (9b50d1cb1, #4308) - a null value threw, silently killing the dropdown.
        it('suggests blank filters for a field with null values in its source', async () => {
            vi.useFakeTimers();
            const store = createStore([
                    {id: 1, region: 'US'},
                    {id: 2, region: null}
                ]),
                model = create({valueSource: store, fieldSpecs: ['region']});
            await vi.advanceTimersByTimeAsync(100);

            expect(labels(await model.queryAsync('Region ='))).toEqual([
                'Region = US',
                'Region is blank',
                'Region is not blank'
            ]);
        });
    });

    describe('setSelectValue', () => {
        it('combines equality tags on one field into a single multi-value filter', () => {
            const model = create({fieldSpecs});

            model.setSelectValue(tags(region('US'), region('UK')));

            expect(model.value.toJSON()).toEqual({field: 'region', op: '=', value: ['US', 'UK']});
        });

        it('ORs tags with different include operators on one field, and ANDs across fields', () => {
            const model = create({fieldSpecs}),
                like: FieldFilterSpec = {field: 'name', op: 'like', value: 'smi'},
                equals: FieldFilterSpec = {field: 'name', op: '=', value: 'Jones'};

            model.setSelectValue(tags(like, equals, region('US')));

            expect(model.value.toJSON()).toEqual({
                op: 'AND',
                filters: [{op: 'OR', filters: [like, equals]}, region('US')]
            });
        });

        it('ORs an exterior range on one field, and ANDs an interior range', () => {
            const model = create({fieldSpecs}),
                below10: FieldFilterSpec = {field: 'price', op: '<', value: 10},
                above100: FieldFilterSpec = {field: 'price', op: '>', value: 100},
                above10: FieldFilterSpec = {field: 'price', op: '>', value: 10},
                below100: FieldFilterSpec = {field: 'price', op: '<', value: 100};

            model.setSelectValue(tags(below10, above100));
            expect(model.value.toJSON()).toEqual({op: 'OR', filters: [below10, above100]});

            model.setSelectValue(tags(above10, below100));
            expect(model.value.toJSON()).toEqual({op: 'AND', filters: [above10, below100]});
        });

        it('recombines the remaining tags when one is removed', async () => {
            const model = create({fieldSpecs}),
                price: FieldFilterSpec = {field: 'price', op: '>', value: 10};
            model.setValue([{field: 'region', op: '=', value: ['US', 'UK', 'Russia']}, price]);
            await wait();
            expect(model.selectValue).toHaveLength(4);

            model.setSelectValue(model.selectValue.filter(it => JSON.parse(it).value !== 'UK'));

            expect(model.value.toJSON()).toEqual({
                op: 'AND',
                filters: [{field: 'region', op: '=', value: ['US', 'Russia']}, price]
            });
        });
    });

    describe('setValue', () => {
        it.each<[string, FilterLike]>([
            ['a field it has no spec for', {field: 'desk', op: '=', value: 'Equities'}],
            [
                'two filters with the same equality operator on one field',
                [region('US'), region('UK')]
            ],
            ['more tags than maxTags', {field: 'region', op: '=', value: ['US', 'UK', 'Russia']}]
        ])('marks the value unsupported for %s', (_, filter) => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Rejections are logged.
            const model = create({fieldSpecs, maxTags: 2});
            model.setValue(region('US'));

            model.setValue(filter);

            expect(model.unsupportedFilter).toBe(true);
            expect(model.value).toBeNull();
        });
    });

    describe('bind', () => {
        it('applies its value to the store, keeping function filters set by other controls', async () => {
            const store = createStore(),
                searchFilter = parseFilter({key: 'search', testFn: () => true}),
                model = create({bind: store, fieldSpecs: storeFieldSpecs});
            store.setFilter(searchFilter);

            model.setValue(region('US'));
            await wait();

            const {filters} = store.filter as CompoundFilter;
            expect(filters[0]).toBe(searchFilter);
            expect(filters[1].toJSON()).toEqual(region('US'));

            model.setValue(null);
            await wait();

            expect(store.filter).toBe(searchFilter);
        });

        it('takes up field filters set directly on the store, ignoring function filters', () => {
            const store = createStore(),
                model = create({bind: store, fieldSpecs: storeFieldSpecs});

            store.setFilter([{key: 'search', testFn: () => true}, region('UK')]);

            expect(model.value.toJSON()).toEqual(region('UK'));
        });
    });

    describe('persistWith', () => {
        it('round-trips its value, applying a restored value to the bound store', async () => {
            const persisted = new MemoryStore(),
                config = {fieldSpecs: storeFieldSpecs, persistWith: persisted.options};

            create(config).setValue(region('US'));
            expect(persisted.data).toEqual({filterChooser: {value: region('US')}});

            const store = createStore();
            create({...config, bind: store});
            await wait();

            expect(store.filter.toJSON()).toEqual(region('US'));
        });

        it('drops persisted favorites on fields it no longer has a spec for', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Rejections are logged.
            const persisted = new MemoryStore({
                    filterChooser: {
                        favorites: [region('US'), {field: 'desk', op: '=', value: 'FX'}]
                    }
                }),
                model = create({fieldSpecs, persistWith: persisted.options});

            expect(model.favorites.map(it => it.toJSON())).toEqual([region('US')]);
        });
    });
});

//------------------
// Helpers
//------------------
/** Field specs for a model bound to the store from `createStore()`, with no values to load. */
const storeFieldSpecs = [
    {field: 'region', values: ['US', 'UK']},
    {field: 'price', enableValues: false}
];

function create(config: FilterChooserConfig): FilterChooserModel {
    const ret = new FilterChooserModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

function createStore(data: PlainObject[] = []): Store {
    const ret = new Store({fields: ['region', {name: 'price', type: 'number'}]});
    ret.loadData(data);
    onTestFinished(() => ret.destroy());
    return ret;
}

function region(value: string): FieldFilterSpec {
    return {field: 'region', op: '=', value};
}

/** Tag values as the FilterChooser select control holds them - one serialized filter each. */
function tags(...specs: FieldFilterSpec[]): string[] {
    return specs.map(it => JSON.stringify(it));
}

function labels(options: {label: string}[]): string[] {
    return options.map(it => it.label);
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
