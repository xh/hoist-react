/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    LeftRightChooserModel,
    type LeftRightChooserConfig,
    type LeftRightChooserItem
} from '@xh/hoist/desktop/cmp/leftrightchooser';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The dual-list chooser behind LeftRightChooser, a form control for picking items from a list.
 * Apps read the picked items from `rightValues`, so the values on each side must track every
 * move, whatever rows are displayed.
 */
describe('LeftRightChooserModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('setData', () => {
        it('splits items between sides, defaulting to the left and omitting excluded items', () => {
            const model = createChooser({
                data: [
                    {text: 'Apple', value: 'apple'},
                    {text: 'Banana', value: 'banana', side: 'right'},
                    {text: 'Cherry', value: 'cherry', side: 'left'},
                    {text: 'Durian', value: 'durian', side: 'right', exclude: true}
                ]
            });

            expect(model.leftValues).toEqual(['apple', 'cherry']);
            expect(model.rightValues).toEqual(['banana']);
        });

        it('groups items when any item has a group, placing the rest under ungroupedName', () => {
            const model = createChooser({ungroupedName: 'Other', data: FRUIT});
            expect(model.leftModel.groupBy).toEqual(['group']);
            expect(model.leftModel.store.allRecords.map(it => it.data.group)).toEqual([
                'Tropical',
                'Other',
                'Tropical'
            ]);

            model.setData([{text: 'Apple', value: 'apple'}]);
            expect(model.leftModel.groupBy).toEqual([]);
        });
    });

    describe('moveRows', () => {
        it('moves unlocked rows to the other side and calls onChange', () => {
            const onChange = vi.fn(),
                model = createChooser({data: FRUIT, onChange});

            model.moveRows(recordsFor(model, 'left', ['mango', 'apple']));

            expect(model.leftValues).toEqual(['kiwi']);
            expect(model.rightValues).toEqual(['mango', 'apple', 'lime']);
            expect(onChange).toHaveBeenCalledOnce();

            model.moveRows(recordsFor(model, 'right', ['apple']));
            expect(model.leftValues).toEqual(['apple', 'kiwi']);
        });

        it('leaves locked rows in place', () => {
            const model = createChooser({
                data: [
                    {text: 'Apple', value: 'apple'},
                    {text: 'Pear', value: 'pear', locked: true}
                ]
            });

            model.moveRows(recordsFor(model, 'left', ['apple', 'pear']));
            expect(model.leftValues).toEqual(['pear']);
            expect(model.rightValues).toEqual(['apple']);
        });

        it('moves nothing when readonly', () => {
            const model = createChooser({data: FRUIT, readonly: true});
            model.moveRows(recordsFor(model, 'left', ['mango']));
            expect(model.rightValues).toEqual(['lime']);
        });
    });

    describe('setDisplayFilter', () => {
        it('filters the rows displayed without changing the values on either side', () => {
            const model = createChooser({data: FRUIT});

            model.setDisplayFilter(rec => rec.data.text.startsWith('M'));

            expect(model.leftModel.store.records.map(it => it.data.value)).toEqual(['mango']);
            expect(model.leftValues).toEqual(['mango', 'apple', 'kiwi']);
            expect(model.rightValues).toEqual(['lime']);
        });
    });

    describe('selection', () => {
        it('clears the selection on one side when a row is selected on the other', () => {
            const model = createChooser({data: FRUIT}),
                {leftModel, rightModel} = model;

            leftModel.selModel.select(recordsFor(model, 'left', ['apple']));
            rightModel.selModel.select(recordsFor(model, 'right', ['lime']));
            expect(leftModel.selModel.isEmpty).toBe(true);

            leftModel.selModel.select(recordsFor(model, 'left', ['kiwi']));
            expect(rightModel.selModel.isEmpty).toBe(true);
        });
    });
});

//------------------
// Test support
//------------------
const FRUIT: LeftRightChooserItem[] = [
    {text: 'Mango', value: 'mango', group: 'Tropical'},
    {text: 'Apple', value: 'apple'},
    {text: 'Kiwi', value: 'kiwi', group: 'Tropical'},
    {text: 'Lime', value: 'lime', side: 'right', locked: true}
];

function createChooser(config: LeftRightChooserConfig): LeftRightChooserModel {
    const ret = new LeftRightChooserModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

function recordsFor(model: LeftRightChooserModel, side: 'left' | 'right', values: string[]) {
    const {store} = side === 'left' ? model.leftModel : model.rightModel;
    return values.map(value => store.allRecords.find(it => it.data.value === value));
}
