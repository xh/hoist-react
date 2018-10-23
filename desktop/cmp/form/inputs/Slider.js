/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {slider as bpSlider, rangeSlider as bpRangeSlider} from '@xh/hoist/kit/blueprint';
import {isArray} from 'lodash';
import {toJS} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A slider input to edit either a single number or an array of two (for a range).
 */
@HoistComponent
@LayoutSupport
export class Slider extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.oneOfType([PT.number, PT.arrayOf(PT.number)]),

        /** Maximum value */
        max: PT.number,

        /** Minimum value */
        min: PT.number,

        /**
         * Callback to render each label, passed the number value for that label point.
         * If true, labels will use number value formatted to labelStepSize decimal places.
         * If false, labels will not be shown.
         */
        labelRenderer: PT.oneOfType([PT.bool, PT.func]),

        /** Increment between successive labels. Must be greater than zero. Defaults to 1. */
        labelStepSize: PT.number,

        /** Increment between values. Must be greater than zero. Defaults to 1. */
        stepSize: PT.number,

        /**
         * True to render a solid bar between min and current values (for simple slider) or between
         * handles (for range slider). Defaults to true.
         */
        showTrackFill: PT.bool,

        /** True to render in a vertical orientation. */
        vertical: PT.bool
    };

    baseClassName = 'xh-slider';

    render() {
        const {props} = this,
            sliderType = isArray(toJS(this.renderValue)) ? bpRangeSlider : bpSlider;

        // Set default left / right padding
        const layoutProps = this.getLayoutProps();
        if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
        if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

        return box({
            item: sliderType({
                value: this.renderValue,

                disabled: props.disabled,
                labelRenderer: props.labelRenderer,
                labelStepSize: props.labelStepSize,
                max: props.max,
                min: props.min,
                showTrackFill: props.showTrackFill,
                stepSize: props.stepSize,
                tabIndex: props.tabIndex,
                vertical: props.vertical,

                onChange: this.onValueChange
            }),

            ...layoutProps,
            className: this.getClassName(),

            onBlur: this.onBlur,
            onFocus: this.onFocus
        });
    }

    onValueChange = (val) => {
        this.noteValueChange(val);
    };
}
export const slider = elemFactory(Slider);
