/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {slider, rangeSlider} from '@xh/hoist/kit/blueprint';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray} from 'lodash';
import {toJS} from 'mobx';
import {HoistField} from '@xh/hoist/cmp/form';

/**
 * A Slider Field.
 *
 * Value can be either a single number (for a simple slider) or an array of 2 numbers (for a range)
 */
@HoistComponent()
@LayoutSupport
export class SliderField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** minimum value */
        min: PT.number,
        /** maximum value */
        max: PT.number,
        /** Increment between successive labels. Must be greater than zero. Defaults to 10 */
        labelStepSize: PT.number,
        /** Callback to render a single label. Useful for formatting numbers as currency or percentages.
            If true, labels will use number value formatted to labelStepSize decimal places. If false, labels will not be shown.
            Can also be a function in the format (value: number) => string */
        labelRenderer: PT.oneOfType([PT.bool, PT.func]),
        /** Increment between values. Must be greater than zero. Defaults to 1 */
        stepSize: PT.number,
        /** Render a solid bar between min and current values (for simple slider) or between handles (for range slider). Defaults to true */
        showTrackFill: PT.bool
    };

    static defaultProps = {
        commitOnChange: true
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-slider-field';

    constructor(props) {
        super(props);
        throwIf(!props.commitOnChange, 'A commitOnChange value of false not implemented on SliderField.');
    }

    render() {
        const {labelStepSize, labelRenderer, min, max, stepSize, showTrackFill, vertical} = this.props,
            input = isArray(toJS(this.renderValue)) ? rangeSlider : slider;

        // Set default left / right padding
        const layoutProps = this.getLayoutProps();
        if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
        if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

        return box({
            ...layoutProps,
            className: this.getClassName(),
            item: input({
                value: this.renderValue,
                onChange: this.onValueChange,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                labelStepSize,
                labelRenderer,
                min,
                max,
                stepSize,
                showTrackFill,
                vertical,
                ...this.getDelegateProps()
            })
        });
    }

    onValueChange = (val) => {
        this.noteValueChange(val);
    }

}
export const sliderField = elemFactory(SliderField);
