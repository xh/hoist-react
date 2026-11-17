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
 * reads out. These guard that each handle takes a name: from an `aria-label` set through
 * `domAttrs`, or from the label of the FormField the slider sits in.
 */
describe('Slider', () => {
    beforeAll(() => initTestAppAsync());

    describe('accessible name', () => {
        it('puts a domAttrs aria-label on its handle and not on the wrapper', () => {
            renderSlider(5, {domAttrs: {'aria-label': 'Risk level'}});

            expect(screen.getByRole('slider', {name: 'Risk level'})).not.toBeNull();
            expect(wrapper().hasAttribute('aria-label')).toBe(false);
        });

        it('puts a domAttrs aria-label on both handles of a range', () => {
            renderSlider([2, 8], {domAttrs: {'aria-label': 'Price'}});

            expect(handleNames()).toEqual(['Price', 'Price']);
        });

        it('puts a domAttrs aria-labelledby on its handle and not on the wrapper', () => {
            renderSlider(5, {domAttrs: {'aria-labelledby': 'risk-heading'}});

            expect(screen.getByRole('slider').getAttribute('aria-labelledby')).toBe('risk-heading');
            expect(wrapper().hasAttribute('aria-labelledby')).toBe(false);
        });

        it('passes other domAttrs to the wrapper', () => {
            renderSlider(5, {domAttrs: {'aria-label': 'Risk level', 'data-kind': 'risk'}});

            expect(wrapper().getAttribute('data-kind')).toBe('risk');
            expect(screen.getByRole('slider').hasAttribute('data-kind')).toBe(false);
        });

        it('sets no name on a slider with no aria-label and no id', () => {
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

        it('prefers a domAttrs aria-label to the label of its FormField', () => {
            renderInField(5, {domAttrs: {'aria-label': 'Risk, from 0 to 10'}});

            expect(screen.getByRole('slider', {name: 'Risk, from 0 to 10'})).not.toBeNull();
        });
    });

    // Blueprint does not guard its scale. A step too small for a number hangs the render, a step
    // of zero throws, and a label step too small for the range floods the page with labels. A
    // scale can come from data, so the slider must draw something for each. Fixed in v91.
    describe('track fill', () => {
        it('fills the track with the primary intent by default', () => {
            renderSlider(5);
            expect(trackFillIntents()).toEqual(['bp6-intent-primary']);
        });

        it('fills the track with the given intent', () => {
            renderSlider(5, {intent: 'danger'});
            expect(trackFillIntents()).toEqual(['bp6-intent-danger']);
        });

        it('fills the track between the handles of a range with the given intent', () => {
            renderSlider([2, 8], {intent: 'success'});
            expect(trackFillIntents()).toEqual(['bp6-intent-success']);
        });
    });

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
            ['a step far below the range', {min: 0, max: 10, stepSize: 1e-150}],
            ['steps of zero', {min: 0, max: 10, stepSize: 0, labelStepSize: 0}],
            ['a range too wide for a label at each step', {min: 0, max: 5000}]
        ])(
            'draws a working slider for %s',
            (_, props) => {
                renderSlider(props.min, props);

                expect(screen.getByRole('slider').getAttribute('aria-disabled')).toBe('false');
                expect(axisLabels().length).toBeLessThanOrEqual(11);
            },
            SCALE_TIMEOUT
        );

        it('draws no labels, however many the label step gives, when labels are off', () => {
            renderSlider(0, {min: 0, max: 5000, labelRenderer: false});

            expect(axisLabels()).toHaveLength(0);
        });

        it('renders disabled for a max not above min', () => {
            renderSlider(0, {min: 10, max: 0});

            expect(screen.getByRole('slider').getAttribute('aria-disabled')).toBe('true');
        });

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

/** The element that takes the slider's `domAttrs`, around the Blueprint slider. */
function wrapper(): HTMLElement {
    return document.querySelector('.xh-slider');
}

/** Intent classes on the filled parts of the track. */
function trackFillIntents(): string[] {
    const fills = document.querySelectorAll('.bp6-slider-progress[class*="bp6-intent-"]');
    return Array.from(fills).flatMap(it =>
        Array.from(it.classList).filter(cls => cls.startsWith('bp6-intent-'))
    );
}

function handleNames(): string[] {
    return screen.getAllByRole('slider').map(it => it.getAttribute('aria-label'));
}

function renderInField(initialValue: Some<number>, props: SliderProps = {}) {
    const model = new FormModel({
        fields: [{name: 'risk', displayName: 'Risk level', initialValue}]
    });
    onTestFinished(() => model.destroy());
    return render(form({model, children: formField({field: 'risk', children: slider(props)})}));
}
