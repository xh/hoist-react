/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {rangeSlider as bpRangeSlider, slider as bpSlider} from '@xh/hoist/kit/blueprint';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isArray} from 'lodash';
import PT from 'prop-types';
import './Slider.scss';

/**
 * A slider input to edit either a single number or an array of two (for a range).
 */
export const [Slider, slider] = hoistCmp.withFactory({
    displayName: 'Slider',
    className: 'xh-slider',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
Slider.propTypes = {
    ...HoistInputPropTypes,
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
Slider.hasLayoutSupport = true;


//-----------------------
// Implementation
//-----------------------

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {width, ...layoutProps} = getLayoutProps(props),
            sliderType = isArray(model.renderValue) ? bpRangeSlider : bpSlider;

        throwIf(
            props.labelStepSize <= 0,
            'Error in Slider: labelStepSize must be greater than zero.'
        );

        // Set default left / right padding
        if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
        if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

        return box({
            item: sliderType({
                value: model.renderValue,

                disabled: props.disabled,
                labelRenderer: props.labelRenderer,
                labelStepSize: props.labelStepSize,
                max: props.max,
                min: props.min,
                showTrackFill: props.showTrackFill,
                stepSize: props.stepSize,
                tabIndex: props.tabIndex,
                vertical: props.vertical,

                onChange: (val) => model.noteValueChange(val)
            }),

            ...layoutProps,
            width: withDefault(width, 200),
            className,

            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);