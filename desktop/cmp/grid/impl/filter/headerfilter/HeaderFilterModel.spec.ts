/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {
    parseFilter,
    type FieldFilterOperator,
    type FieldFilterSpec,
    type FilterLike
} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {onReactionError} from 'mobx';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import {ColumnHeaderFilterModel} from '../ColumnHeaderFilterModel';
import {CustomTabModel} from './custom/CustomTabModel';
import {HeaderFilterModel} from './HeaderFilterModel';

/**
 * The column header filter of desktop grids. Its Values tab picks from a column's values and its
 * Custom tab edits conditions. Each must read the column's current filter back faithfully and
 * commit the same filter - a lossy round trip silently changes the rows a user sees. The popover
 * is not rendered, so its model is linked to its column by hand.
 */
beforeAll(() => initTestAppAsync());

describe('HeaderFilterModel', () => {
    describe('onLinked', () => {
        it.each<{desc: string; field: string; filter: FilterLike; tab: string}>([
            {desc: 'no filter', field: 'region', filter: null, tab: 'valuesFilter'},
            {
                desc: 'an = filter',
                field: 'region',
                filter: {field: 'region', op: '=', value: ['East', 'North']},
                tab: 'valuesFilter'
            },
            {
                desc: 'a != filter',
                field: 'region',
                filter: {field: 'region', op: '!=', value: 'West'},
                tab: 'valuesFilter'
            },
            {
                desc: 'an includes filter on a tags column',
                field: 'tags',
                filter: {field: 'tags', op: 'includes', value: 'fx'},
                tab: 'valuesFilter'
            },
            {
                desc: 'a like filter',
                field: 'region',
                filter: {field: 'region', op: 'like', value: 'st'},
                tab: 'customFilter'
            },
            {
                desc: 'an OR of conditions',
                field: 'region',
                filter: {
                    op: 'OR',
                    filters: [REGION_EAST, {field: 'region', op: 'like', value: 'th'}]
                },
                tab: 'customFilter'
            },
            {
                // Fixed in 86.1.0 (#4440) - the Values tab cannot express a blank tags value.
                desc: 'an "is blank" filter on a tags column',
                field: 'tags',
                filter: {field: 'tags', op: '=', value: null},
                tab: 'customFilter'
            },
            {
                desc: 'a filter on a column without values',
                field: 'qty',
                filter: {field: 'qty', op: '=', value: 10},
                tab: 'customFilter'
            }
        ])('opens the $tab tab for $desc', ({field, filter, tab}) => {
            const grid = createGrid(filter);
            expect(openFilter(grid, field).tabContainerModel.activeTabId).toBe(tab);
        });
    });

    describe('commit', () => {
        it('applies the pending filter to its column, keeping filters on other columns', async () => {
            const grid = createGrid({field: 'qty', op: '>', value: 15}),
                model = openFilter(grid, 'region');

            check(model, ['North', 'South', '[blank]']);
            model.commit();
            await wait();

            expect(grid.store.records.map(it => it.data.region)).toEqual(['North', 'South', null]);
            expect(model.parent.isOpen).toBe(false);
        });
    });

    describe('clear', () => {
        it('removes the filter on its column only', async () => {
            const grid = createGrid({
                    op: 'AND',
                    filters: [REGION_EAST, {field: 'qty', op: '<', value: 15}]
                }),
                model = openFilter(grid, 'region');

            model.clear();
            await wait();

            expect(grid.filterModel.getColumnFilters('region')).toEqual([]);
            expect(grid.filterModel.getColumnFilters('qty')).toHaveLength(1);
        });
    });

    describe('isDirty', () => {
        it('is true once the pending filter differs from the column filter', () => {
            const model = openFilter(createGrid(REGION_EAST), 'region');
            expect(model.isDirty).toBe(false);

            check(model, ['East', 'North']);
            expect(model.isDirty).toBe(true);
        });

        // BUG: HeaderFilterModel.ts:97 - compares against the column's filters flattened and
        // ANDed together, so an OR filter reads as changed and enables Apply on open.
        it.fails('is false for an unchanged OR filter', () => {
            const filter: FilterLike = {
                    op: 'OR',
                    filters: [REGION_EAST, {field: 'region', op: 'like', value: 'th'}]
                },
                model = openFilter(createGrid(filter), 'region');
            expect(model.isDirty).toBe(false);
        });
    });
});

describe('ValuesTabModel', () => {
    describe('filter', () => {
        // The region column has 5 values, including a blank entry for the null region. A short list
        // like this prefers '=' until the checked values outnumber the unchecked 2.5 to 1.
        it.each<{desc: string; checked: string[]; filter: FilterLike}>([
            {
                desc: 'no filter when every value is checked',
                checked: ['East', 'North', 'South', 'West', '[blank]'],
                filter: null
            },
            {desc: 'no filter when no value is checked', checked: [], filter: null},
            {
                desc: 'an = filter on a single checked value',
                checked: ['East'],
                filter: {field: 'region', op: '=', value: 'East'}
            },
            {
                desc: 'an = filter on the checked values while several are unchecked',
                checked: ['East', 'North', 'South'],
                filter: {field: 'region', op: '=', value: ['East', 'North', 'South']}
            },
            {
                desc: 'a != filter on the unchecked values once few are unchecked',
                checked: ['East', 'North', 'South', '[blank]'],
                filter: {field: 'region', op: '!=', value: 'West'}
            },
            {
                desc: 'a null value for the blank entry',
                checked: ['East', 'North', 'South', 'West'],
                filter: {field: 'region', op: '!=', value: null}
            }
        ])('outputs $desc', ({checked, filter}) => {
            const model = openFilter(createGrid(), 'region');
            check(model, checked);
            expect(model.valuesTabModel.filter).toEqual(filter);
        });

        it('outputs an includes filter on the checked tags of a tags column', () => {
            const model = openFilter(createGrid(), 'tags');
            check(model, ['credit', 'fx', 'rates']);
            expect(model.valuesTabModel.filter).toEqual({
                field: 'tags',
                op: 'includes',
                value: ['credit', 'fx', 'rates']
            });
        });
    });

    describe('syncWithFilter', () => {
        it.each<{op: FieldFilterOperator; value: string | string[]; checked: string[]}>([
            {op: '=', value: ['East', 'North'], checked: ['East', 'North']},
            {op: '!=', value: 'West', checked: ['East', 'North', 'South', '[blank]']}
        ])('checks the values that pass a $op filter', ({op, value, checked}) => {
            const model = openFilter(createGrid({field: 'region', op, value}), 'region');
            expect(checkedValues(model)).toEqual(checked);
        });

        // Fixed in 86.0.0 (914715d9a) - reopening a tags filter threw 'ID fx is not unique' and
        // showed the filtered tags unchecked.
        it('checks the filtered tags of a tags column', () => {
            const model = openFilter(
                createGrid({field: 'tags', op: 'includes', value: ['fx', 'rates']}),
                'tags'
            );
            expect(checkedValues(model)).toEqual(['fx', 'rates']);
        });
    });

    // BUG: values/ValuesTabModel.ts:122 - the constructor's syncGrid() reaction fires immediately,
    // before reset() loads the column's values, and throws on the null `values`. MobX logs the
    // error the first time each column's filter opens.
    it.fails('opens on a column for the first time without a reaction error', () => {
        const errors = [];
        onTestFinished(onReactionError(e => errors.push(e)));

        openFilter(createGrid(), 'region', {firstOpen: true});
        expect(errors).toEqual([]);
    });
});

describe('CustomTabModel', () => {
    // A filter must come back out of the rows unchanged, or applying the tab rewrites it.
    it.each<{desc: string; field: string; filter: FilterLike; rows: unknown[][]; op: string}>([
        {
            // Fixed in 86.3.0 (#4466) - multi-value filters went into single-value inputs, showing
            // NaN or comma-joined text, and were corrupted on commit.
            desc: 'a multi-value = filter on a number column as one row per value, joined by OR',
            field: 'qty',
            filter: {field: 'qty', op: '=', value: [10, 20]},
            rows: [
                ['=', 10],
                ['=', 20]
            ],
            op: 'OR'
        },
        {
            desc: 'a multi-value != filter on a number column as one row per value, joined by AND',
            field: 'qty',
            filter: {field: 'qty', op: '!=', value: [10, 20]},
            rows: [
                ['!=', 10],
                ['!=', 20]
            ],
            op: 'AND'
        },
        {
            desc: 'a multi-value filter on a column with values as a single row',
            field: 'region',
            filter: {
                op: 'OR',
                filters: [
                    {field: 'region', op: '=', value: ['East', 'North']},
                    {field: 'region', op: 'like', value: 'th'}
                ]
            },
            rows: [
                ['=', ['East', 'North']],
                ['like', 'th']
            ],
            op: 'OR'
        },
        {
            desc: 'an "is blank" filter on a tags column as a blank row',
            field: 'tags',
            filter: {field: 'tags', op: '=', value: null},
            rows: [['blank', null]],
            op: 'AND'
        }
    ])('shows $desc, and outputs it unchanged', ({field, filter, rows, op}) => {
        const {customTabModel} = openFilter(createGrid(filter), field);

        expect(customTabModel.rowModels.map(it => [it.op, it.inputVal])).toEqual(rows);
        expect(customTabModel.op).toBe(op);
        expect(parseFilter(customTabModel.filter).equals(parseFilter(filter))).toBe(true);
    });

    it('leaves a filter it cannot show as rows unchanged', () => {
        vi.spyOn(CustomTabModel.prototype, 'logWarn').mockImplementation(() => {});
        const filter: FilterLike = {
                op: 'OR',
                filters: [
                    {field: 'qty', op: '<', value: 15},
                    {
                        op: 'AND',
                        filters: [
                            {field: 'qty', op: '>', value: 25},
                            {field: 'qty', op: '<', value: 45}
                        ]
                    }
                ]
            },
            {customTabModel} = openFilter(createGrid(filter), 'qty');

        expect(customTabModel.rowModels).toBeNull();
        expect(parseFilter(customTabModel.filter).equals(parseFilter(filter))).toBe(true);
    });
});

//------------------
// Test support
//------------------
const REGION_EAST: FieldFilterSpec = {field: 'region', op: '=', value: 'East'};

/** A grid with column filters, loaded with rows and filtered by the given filter. */
function createGrid(filter: FilterLike = null): GridModel {
    const ret = new GridModel({
        store: {
            fields: [
                {name: 'region', type: 'string'},
                {name: 'qty', type: 'int'},
                {name: 'tags', type: 'tags'}
            ]
        },
        filterModel: true,
        columns: [
            {field: 'region', filterable: true},
            {field: 'qty', filterable: true},
            {field: 'tags', filterable: true}
        ]
    });
    ret.loadData([
        {id: 1, region: 'East', qty: 10, tags: ['fx', 'rates']},
        {id: 2, region: 'North', qty: 20, tags: ['fx']},
        {id: 3, region: 'South', qty: 30, tags: ['credit', 'equity']},
        {id: 4, region: 'West', qty: 40, tags: []},
        {id: 5, region: null, qty: 50, tags: ['rates']}
    ]);
    ret.store.setFilter(filter);
    onTestFinished(() => ret.destroy());
    return ret;
}

/**
 * Open the header filter of a column, as its popover does. By default the column's values are
 * loaded first, as a previous open would have, to sidestep the first-open bug tested above.
 */
function openFilter(gridModel: GridModel, field: string, {firstOpen = false} = {}) {
    if (!firstOpen) gridModel.filterModel.getFieldSpec(field).loadValues();

    const parent = new ColumnHeaderFilterModel(gridModel.filterModel, gridModel.getColumn(field)),
        ret = new HeaderFilterModel();
    parent.open();
    ret.parent = parent;
    ret.onLinked();

    onTestFinished(() => {
        ret.destroy();
        parent.destroy();
    });
    return ret;
}

/** Check exactly the given values in the Values tab. */
function check(model: HeaderFilterModel, values: string[]) {
    const {valuesTabModel} = model;
    valuesTabModel.setRecsChecked(false, valuesTabModel.values);
    valuesTabModel.setRecsChecked(true, values);
}

/** Values shown checked in the Values tab. */
function checkedValues(model: HeaderFilterModel): string[] {
    return model.valuesTabModel.gridModel.store.allRecords
        .filter(it => it.data.isChecked)
        .map(it => it.data.value)
        .sort();
}
