/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    RangeSliderProps as BpRangeSliderProps,
    SliderProps as BpSliderProps
} from '@blueprintjs/core';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, LayoutProps, Some} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {rangeSlider as bpRangeSlider, slider as bpSlider} from '@xh/hoist/kit/blueprint';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isArray} from 'lodash';
import {ReactNode} from 'react';
import './Slider.scss';

export interface SliderProps extends HoistProps, HoistInputProps, LayoutProps {
    value?: Some<number>;

    /** Maximum value */
    max?: number;

    /** Minimum value */
    min?: number;

    /**
     * Callback to render each label, passed the number value for that label point.
     * If true, labels will use number value formatted to labelStepSize decimal places.
     * If false, labels will not be shown.
     */
    labelRenderer?: boolean | ((value: number) => ReactNode);

    /** Increment between successive labels. Must be greater than zero. Defaults to 1. */
    labelStepSize?: number;

    /** Increment between values. Must be greater than zero. Defaults to 1. */
    stepSize?: number;

    /**
     * True to render a solid bar between min and current values (for simple slider) or between
     * handles (for range slider). Defaults to true.
     */
    showTrackFill?: boolean;

    /** True to render in a vertical orientation. */
    vertical?: boolean;
}

/**
 * A slider input to edit either a single number or an array of two (for a range).
 */
export const [Slider, slider] = hoistCmp.withFactory<SliderProps>({
    displayName: 'Slider',
    className: 'xh-slider',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SliderInputModel);
    }
});
(Slider as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class SliderInputModel extends HoistInputModel {
    override xhImpl = true;

    get sliderHandle(): HTMLElement {
        return this.domEl?.querySelector('.bp5-slider-handle');
    }

    override blur() {
        this.sliderHandle?.blur();
    }

    override focus() {
        this.sliderHandle?.focus();
    }
}

const cmp = hoistCmp.factory<SliderInputModel>(({model, className, ...props}, ref) => {
    const {width, ...layoutProps} = getLayoutProps(props);

    throwIf(props.labelStepSize <= 0, 'Error in Slider: labelStepSize must be greater than zero.');

    // Set default left / right padding
    if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
    if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

    const sliderProps: BpRangeSliderProps | BpSliderProps = {
        value: model.renderValue,

        disabled: props.disabled,
        labelRenderer: props.labelRenderer,
        labelStepSize: props.labelStepSize,
        max: props.max,
        min: props.min,
        showTrackFill: props.showTrackFill,
        stepSize: props.stepSize,
        vertical: props.vertical,

        onChange: val => model.noteValueChange(val)
    };

    return box({
        item: isArray(model.renderValue)
            ? bpRangeSlider(sliderProps as BpRangeSliderProps)
            : bpSlider(sliderProps as BpSliderProps),

        ...layoutProps,
        width: withDefault(width, 200),
        className,

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        ref
    });
});
