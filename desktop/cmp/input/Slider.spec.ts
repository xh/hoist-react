/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {HoistModel} from '@xh/hoist/core';
import type {Some} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {slider} from '@xh/hoist/desktop/cmp/input';
import type {SliderProps} from '@xh/hoist/desktop/cmp/input';
import {bindableRef} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A slider handle is the element with the `slider` role, so it is what assistive technology
 * reads out. These guard that each handle takes a name: from `ariaLabel`, or from the label of
 * the FormField the slider sits in.
 */
describe('Slider', () => {
    beforeAll(() => initTestAppAsync());

    describe('accessible name', () => {
        it('names its handle from ariaLabel', () => {
            renderSlider(5, {ariaLabel: 'Risk level'});

            expect(screen.getByRole('slider', {name: 'Risk level'})).not.toBeNull();
        });

        it('names the handles of a range from a pair', () => {
            renderSlider([2, 8], {ariaLabel: ['Lowest price', 'Highest price']});

            expect(handleNames()).toEqual(['Lowest price', 'Highest price']);
        });

        it('gives both handles of a range a single name', () => {
            renderSlider([2, 8], {ariaLabel: 'Price'});

            expect(handleNames()).toEqual(['Price', 'Price']);
        });

        it('sets no name on a slider with no ariaLabel and no id', () => {
            renderSlider(5);
            const handle = screen.getByRole('slider');

            expect(handle.hasAttribute('aria-label')).toBe(false);
            expect(handle.hasAttribute('aria-labelledby')).toBe(false);
        });

        it('takes the label of its FormField', () => {
            renderInField(5);

            expect(screen.getByRole('slider', {name: 'Risk level'})).not.toBeNull();
        });

        it('gives both handles of a range the label of its FormField', () => {
            renderInField([2, 8]);

            expect(screen.getAllByRole('slider', {name: 'Risk level'})).toHaveLength(2);
        });

        it('prefers ariaLabel to the label of its FormField', () => {
            renderInField(5, {ariaLabel: 'Risk, from 0 to 10'});

            expect(screen.getByRole('slider', {name: 'Risk, from 0 to 10'})).not.toBeNull();
        });
    });
});

//------------------
// Helpers
//------------------
class ValueModel extends HoistModel {
    @bindableRef accessor value: Some<number>;

    constructor(value: Some<number>) {
        super();
        this.value = value;
    }
}

function renderSlider(value: Some<number>, props: SliderProps = {}) {
    const model = new ValueModel(value);
    onTestFinished(() => model.destroy());
    return render(slider({model, bind: 'value', ...props}));
}

function handleNames(): string[] {
    return screen.getAllByRole('slider').map(it => it.getAttribute('aria-label'));
}

function renderInField(initialValue: Some<number>, props: SliderProps = {}) {
    const model = new FormModel({
        fields: [{name: 'risk', displayName: 'Risk level', initialValue}]
    });
    onTestFinished(() => model.destroy());
    return render(form({model, item: formField({field: 'risk', item: slider(props)})}));
}
