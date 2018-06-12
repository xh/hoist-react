/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import {slider, rangeSlider} from '@xh/hoist/kit/blueprint';
import {isArray} from 'lodash';
import {toJS} from 'mobx';
import {HoistField} from './HoistField';

/**
 * A Slider Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent({layoutSupport: true})
export class SliderField extends HoistField {

    static propTypes = {
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
        stepSize: PT.number
    };

    delegateProps = ['className', 'disabled'];

    render() {
        const {labelStepSize, labelRenderer, layoutConfig = {}, min, max, stepSize, vertical} = this.props,
            input = isArray(toJS(this.renderValue)) ? rangeSlider : slider;

        if (!layoutConfig.padding && !layoutConfig.paddingLeft) layoutConfig.paddingLeft = 15;
        if (!layoutConfig.padding && !layoutConfig.paddingRight) layoutConfig.paddingRight = 15;

        return box({
            layoutConfig,
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
                vertical,
                ...this.getDelegateProps()
            })
        });
    }

    onValueChange = (val) => {
        this.noteValueChange(val);
        this.doCommit();
    }

}
export const sliderField = elemFactory(SliderField);