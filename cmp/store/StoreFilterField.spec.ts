/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import type {FilterMatchOn} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {storeFilterField} from './StoreFilterField';

/**
 * `StoreFilterField` filters its store on each record's raw values, or with `matchOn`, on the text
 * the bound grid's columns show.
 */
describe('StoreFilterField', () => {
    beforeAll(() => initTestAppAsync());

    it.each<{matchOn: FilterMatchOn; raw: number[]; shown: number[]}>([
        {matchOn: undefined, raw: [2], shown: []},
        {matchOn: 'rendered', raw: [], shown: [2]},
        {matchOn: 'all', raw: [2], shown: [2]}
    ])(
        'filters on raw values, or the text shown, per matchOn $matchOn',
        async ({matchOn, ...expected}) => {
            const gridModel = new GridModel({
                columns: [
                    {field: 'name'},
                    {field: 'qty', renderer: (v: number) => v.toLocaleString('en-US')}
                ]
            });
            onTestFinished(() => gridModel.destroy());
            gridModel.loadData([
                {id: 1, name: 'Alpha', qty: 10},
                {id: 2, name: 'Beta', qty: 1234}
            ]);

            const {container} = render(
                    // The component looks up a model from context, which this test has none of.
                    storeFilterField({model: gridModel, gridModel, matchOn, filterBuffer: 0})
                ),
                input = container.querySelector('input'),
                filterTo = async (value: string, ids: number[]) => {
                    fireEvent.change(input, {target: {value}});
                    await waitFor(() =>
                        expect(gridModel.store.records.map(it => it.id)).toEqual(ids)
                    );
                };

            await filterTo('1234', expected.raw);
            await filterTo('1,234', expected.shown);
        }
    );
});
