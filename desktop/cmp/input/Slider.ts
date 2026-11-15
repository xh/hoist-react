/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    RangeSliderProps as BpRangeSliderProps,
    SliderProps as BpSliderProps
} from '@blueprintjs/core';
import type {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box} from '@xh/hoist/cmp/layout';
import type {HoistProps, LayoutProps, Some} from '@xh/hoist/core';
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {rangeSlider as bpRangeSlider, slider as bpSlider} from '@xh/hoist/kit/blueprint';
import {logWarn, withDefault} from '@xh/hoist/utils/js';
import {composeRefs, getLayoutProps, useOnResize} from '@xh/hoist/utils/react';
import {castArray, isArray, isEmpty, isFinite} from 'lodash';
import type {ReactNode} from 'react';
import {useLayoutEffect, useRef} from 'react';
import './Slider.scss';

export interface SliderProps extends HoistProps, HoistInputProps, LayoutProps {
    value?: Some<number>;

    /**
     * Accessible name for the handle, set as its `aria-label`. For a range slider, pass a pair to
     * name the start and end handles, or one name for both. A slider in a `FormField` with no
     * `ariaLabel` takes the label of the field as the name of its handles.
     */
    ariaLabel?: Some<string>;

    /** Maximum value. Must be greater than `min`. Defaults to 10. */
    max?: number;

    /** Minimum value. Defaults to 0. */
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
 *
 * The slider never fails on a scale it cannot draw. It replaces a `stepSize` or `labelStepSize`
 * that is not a positive number with 1, raises a `stepSize` too small for the range, and shows a
 * label at each end only when `labelStepSize` gives more than 1,000 labels. With a `min` or `max`
 * that is not a number, or a `max` not above `min`, it renders disabled. It logs a warning for
 * each of these in development mode.
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
        return this.domEl?.querySelector('.bp6-slider-handle');
    }

    override blur() {
        this.sliderHandle?.blur();
    }

    override focus() {
        this.sliderHandle?.focus();
    }

    /** Warn once per slider, as a scale that needs a change is likely to need it on each render. */
    warnOfScaleChanges(changes: string[]) {
        if (this.hasWarned || isEmpty(changes) || !XH.isDevelopmentMode) return;
        this.hasWarned = true;
        logWarn(`Slider changed a scale it could not draw: ${changes.join(' ')}`, 'Slider');
    }

    private hasWarned = false;
}

const cmp = hoistCmp.factory<SliderInputModel>(({model, className, ...props}, ref) => {
    const {width, ...layoutProps} = getLayoutProps(props),
        scale = getSafeScale(props),
        boxRef = useRef<HTMLElement>(null),
        // Blueprint places the handles once it has measured its track, after this effect runs.
        resizeRef = useOnResize(() => fitLabels(boxRef.current));

    // Runs after every render, so a handle label follows its handle as it moves.
    useLayoutEffect(() => fitLabels(boxRef.current));

    model.warnOfScaleChanges(scale.changes);

    // Set default left / right padding
    if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
    if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

    const isRange = isArray(model.renderValue),
        [startLabel, endLabel = startLabel] = castArray(props.ariaLabel ?? []),
        // FormField renders its label with an id derived from the input's id - see FormField.
        labelledBy = props.id ? `${props.id}-label` : undefined,
        handleAttrs = (label: string) =>
            label ? {'aria-label': label} : {'aria-labelledby': labelledBy};

    const sliderProps: BpRangeSliderProps | BpSliderProps = {
        value: model.renderValue,

        disabled: props.disabled || scale.disabled,
        labelPrecision: scale.labelPrecision,
        labelRenderer: props.labelRenderer,
        labelStepSize: scale.labelStepSize,
        labelValues: scale.labelValues,
        max: scale.max,
        min: scale.min,
        showTrackFill: props.showTrackFill,
        stepSize: scale.stepSize,
        vertical: props.vertical,

        onChange: val => model.noteValueChange(val)
    };

    return box({
        item: isRange
            ? bpRangeSlider({
                  ...(sliderProps as BpRangeSliderProps),
                  handleHtmlProps: {start: handleAttrs(startLabel), end: handleAttrs(endLabel)}
              })
            : bpSlider({
                  ...(sliderProps as BpSliderProps),
                  handleHtmlProps: handleAttrs(startLabel)
              }),

        ...layoutProps,
        width: withDefault(width, 200),
        className,
        testId: props.testId,
        domAttrs: props.domAttrs,

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        ref: composeRefs(ref, boxRef, resizeRef)
    });
});

//-----------------------
// Labels
//-----------------------
/**
 * Shift each label that crosses an edge of the slider back inside it. Blueprint centers a label on
 * its tick or handle, so a long label at either end of the track runs past the side padding. Only
 * the end labels of the axis and the handle labels can reach an edge. A label that fits keeps its
 * centered place.
 */
function fitLabels(el: HTMLElement) {
    if (!el || el.querySelector('.bp6-slider.bp6-vertical')) return;

    const labels = [
        el.querySelector<HTMLElement>('.bp6-slider-axis > .bp6-slider-label:first-child'),
        el.querySelector<HTMLElement>('.bp6-slider-axis > .bp6-slider-label:last-child'),
        ...Array.from(el.querySelectorAll<HTMLElement>('.bp6-slider-handle .bp6-slider-label'))
    ];

    // Reset every label before measuring, so that no shift is measured as part of a label.
    labels.forEach(label => label?.style.removeProperty('translate'));

    const {left, right} = el.getBoundingClientRect();
    labels.forEach(label => {
        if (!label) return;
        const rect = label.getBoundingClientRect(),
            shift =
                rect.left < left ? left - rect.left : rect.right > right ? right - rect.right : 0;
        if (shift) label.style.translate = `${shift}px`;
    });
}

//-----------------------
// Scale
//-----------------------
/** Most labels a slider draws along its axis. */
const MAX_LABELS = 1000;

/** Smallest `stepSize`, as a fraction of the range. A smaller step is lost in number precision. */
const MIN_STEP_RATIO = 1e-12;

/** Most decimal places for a default label. Number precision gives out before this. */
const MAX_LABEL_PRECISION = 20;

/** Blueprint draws a label at each step from `min` until it passes `max` by this much. */
const LABEL_TOLERANCE = 0.00001;

interface SliderScale {
    min: number;
    max: number;
    stepSize: number;
    /** Undefined when `labelValues` is set - Blueprint takes one or the other. */
    labelStepSize: number;
    labelValues: number[];
    labelPrecision: number;
    /** True when the scale is a stand-in, so the slider must not take input. */
    disabled: boolean;
    /** A sentence for each prop changed, for the developer. */
    changes: string[];
}

/**
 * The scale to hand to Blueprint, which does not guard against one it cannot draw. It reads the
 * decimal places of `stepSize` in a loop that never ends for a number too small. It draws a label
 * for each `labelStepSize` in the range, however many. It divides by the range. Returns the props
 * as given for any scale that Blueprint draws.
 */
function getSafeScale(props: SliderProps): SliderScale {
    const changes: string[] = [];
    let min = props.min ?? 0,
        max = props.max ?? 10,
        stepSize = props.stepSize ?? 1,
        labelStepSize = props.labelStepSize,
        labelValues: number[],
        disabled = false;

    // 1) A range that is a positive, finite number, with a finite inverse.
    if (!(max > min) || !isFinite(max - min) || !isFinite(1 / (max - min))) {
        changes.push(`min ${props.min} and max ${props.max} give no range - rendered disabled.`);
        if (!isFinite(min)) min = 0;
        max = min + Math.max(1, Math.abs(min) * 1e-6);
        disabled = true;
    }
    const range = max - min;

    // 2) A step that is a positive number, and large enough to tell values in the range apart.
    if (!isFinite(stepSize) || stepSize <= 0) {
        changes.push(`stepSize ${props.stepSize} is not a positive number - used 1.`);
        stepSize = 1;
    }
    if (stepSize < range * MIN_STEP_RATIO) {
        stepSize = range * MIN_STEP_RATIO;
        changes.push(`stepSize ${props.stepSize} is too small for the range - used ${stepSize}.`);
    }

    // 3) A label step that is a positive number, and gives a number of labels a page can hold.
    if (labelStepSize != null && (!isFinite(labelStepSize) || labelStepSize <= 0)) {
        changes.push(`labelStepSize ${props.labelStepSize} is not a positive number - used 1.`);
        labelStepSize = undefined;
    }
    if (
        props.labelRenderer !== false &&
        (range + LABEL_TOLERANCE) / (labelStepSize ?? 1) >= MAX_LABELS
    ) {
        changes.push(
            `labelStepSize ${props.labelStepSize ?? 1} gives over ${MAX_LABELS} labels - ` +
                'showed a label at each end only.'
        );
        labelStepSize = undefined;
        labelValues = [min, max];
    }

    return {
        min,
        max,
        stepSize,
        labelStepSize,
        labelValues,
        labelPrecision: countDecimalPlaces(stepSize),
        disabled,
        changes
    };
}

/**
 * Decimal places in a number, as Blueprint counts them to format a default label, but with a
 * limit. Blueprint's own count never ends for a number below about 1e-308.
 */
function countDecimalPlaces(num: number): number {
    let e = 1,
        places = 0;
    while (places < MAX_LABEL_PRECISION && Math.round(num * e) / e !== num) {
        e *= 10;
        places++;
    }
    return places;
}
