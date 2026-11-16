/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, XH} from '@xh/hoist/core';
import type {Some} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {slider} from '@xh/hoist/desktop/cmp/input';
import type {SliderProps} from '@xh/hoist/desktop/cmp/input';
import {bindableRef} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

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
    // Blueprint does not guard its scale. A step too small for a number hangs the render, a label
    // step too small for the range floods the page with labels, and an empty range throws. A
    // scale can come from data, so the slider must draw something for each. Fixed in v91.
    describe('scale', () => {
        it('draws an ordinary scale as given', () => {
            const warn = spyOnWarn();
            renderSlider(50, {min: 0, max: 100, stepSize: 5, labelStepSize: 25});
            const handle = screen.getByRole('slider');

            expect(axisLabels()).toEqual(['0', '25', '50', '75', '100']);
            expect(handle.getAttribute('aria-valuemin')).toBe('0');
            expect(handle.getAttribute('aria-valuemax')).toBe('100');
            expect(handle.getAttribute('aria-disabled')).toBe('false');
            expect(warn).not.toHaveBeenCalled();
        });

        it('shows default labels to the decimal places of the step', () => {
            renderSlider(0.5, {min: 0, max: 1, stepSize: 0.25, labelStepSize: 0.5});

            expect(axisLabels()).toEqual(['0.00', '0.50', '1.00']);
        });

        it.each([
            ['a step below the smallest normal number', {min: 0, max: 10, stepSize: 1e-310}],
            ['a step far below the range', {min: 0, max: 10, stepSize: 1e-150}],
            ['a step of zero', {min: 0, max: 10, stepSize: 0}],
            ['a negative step', {min: 0, max: 10, stepSize: -1}],
            ['a step that is not a number', {min: 0, max: 10, stepSize: NaN}],
            ['a label step of zero', {min: 0, max: 10, labelStepSize: 0}],
            ['a label step that is not a number', {min: 0, max: 10, labelStepSize: NaN}]
        ])(
            'draws a working slider for %s',
            (_, props) => {
                renderSlider(5, props);
                const handle = screen.getByRole('slider');

                expect(handle.getAttribute('aria-disabled')).toBe('false');
                expect(axisLabels().length).toBeLessThanOrEqual(11);
            },
            SCALE_TIMEOUT
        );

        it.each([
            [
                'a tiny range with a label step to match',
                {min: 0, max: 1e-306, labelStepSize: 1e-306}
            ],
            ['a range below the label tolerance', {min: 0, max: 1e-11, labelStepSize: 1e-11}],
            ['a range far above its label step', {min: 5, max: 5.0000000001, labelStepSize: 1e-10}],
            ['a wide range with the default label step', {min: 0, max: 5000}]
        ])(
            'shows a label at each end only for %s',
            (_, props) => {
                renderSlider(props.min, props);

                expect(axisLabels()).toHaveLength(2);
                expect(screen.getByRole('slider').getAttribute('aria-disabled')).toBe('false');
            },
            SCALE_TIMEOUT
        );

        it('draws no labels, however many the label step gives, when labels are off', () => {
            renderSlider(0, {min: 0, max: 5000, labelRenderer: false});

            expect(axisLabels()).toHaveLength(0);
        });

        it.each([
            ['max equal to min', {min: 1e20, max: 1e20}],
            ['max below min', {min: 10, max: 0}],
            ['a range too small to divide by', {min: 0, max: 5e-324}],
            ['a range too large for a number', {min: -1e308, max: 1e308}],
            ['a min that is not a number', {min: NaN, max: 10}],
            ['an infinite max', {min: 0, max: Infinity}]
        ])(
            'renders disabled for %s',
            (_, props) => {
                renderSlider(0, props);

                expect(screen.getByRole('slider').getAttribute('aria-disabled')).toBe('true');
            },
            SCALE_TIMEOUT
        );

        it('warns once in development mode when it changes a scale', () => {
            const warn = spyOnWarn(),
                {rerender, model} = renderSlider(5, {min: 0, max: 10, stepSize: 0});

            rerender(slider({model, bind: 'value', min: 0, max: 10, stepSize: 0, disabled: true}));

            expect(warn).toHaveBeenCalledTimes(XH.isDevelopmentMode ? 1 : 0);
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
    return {model, ...render(slider({model, bind: 'value', ...props}))};
}

/** A render that does not end fails here, not at the default timeout. */
const SCALE_TIMEOUT = 2000;

/** Text of the labels along the axis, without the label on each handle. */
function axisLabels(): string[] {
    const labels = document.querySelectorAll('.bp6-slider-axis .bp6-slider-label');
    return Array.from(labels).map(it => it.textContent);
}

function spyOnWarn() {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    onTestFinished(() => spy.mockRestore());
    return spy;
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
