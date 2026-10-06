/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridFilterFieldSpec, GridModel} from '@xh/hoist/cmp/grid';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The values a grid column filter offers for selection, as listed in its Values tab. Values must
 * reflect the other active column filters without dropping a value the user has already selected,
 * and must line up with the Store's values for `tags` fields, which have crashed the tab before.
 */
describe('GridFilterFieldSpec', () => {
    beforeAll(() => initTestAppAsync());

    describe('loadValues', () => {
        it('lists null and empty values once, as a blank placeholder', () => {
            const spec = loadedSpec(createGridModel(), 'region');

            expect(spec.values).toEqual(['EU', 'US', '[blank]']);
        });

        it('narrows values to records passing other filters, keeping its selections', async () => {
            const gridModel = createGridModel(),
                {filterModel} = gridModel;

            filterModel.setColumnFilters('region', {field: 'region', op: '=', value: 'US'});
            await wait();
            filterModel.setColumnFilters('name', {field: 'name', op: '=', value: ['Dee']});
            await wait();

            const spec = loadedSpec(gridModel, 'name');
            expect(spec.values).toEqual(['Ann', 'Bob', 'Dee']);
            expect(spec.allValuesCount).toBe(5);
        });

        it('lists each tag once when its tags field is filtered', async () => {
            // Fixed in 86.0.0 (914715d9a) - a filtered tag was listed again as an array, crashing
            // the Values tab with a duplicate ID.
            const gridModel = createGridModel(),
                {filterModel} = gridModel;

            filterModel.setColumnFilters('tags', {field: 'tags', op: 'includes', value: ['a']});
            await wait();

            expect(loadedSpec(gridModel, 'tags').values).toEqual(['a', 'b', 'c']);
        });

        it('does not list a blank tag for a blank tags filter', async () => {
            // Fixed in 86.1.0 (#4440) - a blank filter added a phantom blank tag to the list.
            const gridModel = createGridModel(),
                {filterModel} = gridModel;

            filterModel.setColumnFilters('tags', {field: 'tags', op: '=', value: null});
            await wait();

            expect(loadedSpec(gridModel, 'tags').values).toEqual(['a', 'b', 'c']);
        });
    });
});

//------------------
// Helpers
//------------------
function createGridModel(): GridModel {
    const ret = new GridModel({
        sizingMode: 'standard',
        store: {fields: [{name: 'tags', type: 'tags'}]},
        columns: [{field: 'name'}, {field: 'region'}, {field: 'tags'}],
        filterModel: true
    });
    ret.loadData([
        {id: 1, name: 'Ann', region: 'US', tags: ['a', 'b']},
        {id: 2, name: 'Bob', region: 'US', tags: ['b', 'c']},
        {id: 3, name: 'Cid', region: '', tags: []},
        {id: 4, name: 'Dee', region: 'EU', tags: ['c']},
        {id: 5, name: 'Eve', region: null, tags: []}
    ]);
    onTestFinished(() => ret.destroy());
    return ret;
}

function loadedSpec(gridModel: GridModel, field: string): GridFilterFieldSpec {
    const ret = gridModel.filterModel.getFieldSpec(field);
    ret.loadValues();
    return ret;
}
