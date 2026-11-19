/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {box} from '@xh/hoist/cmp/layout';
import type {HoistProps, Intent, LayoutProps, Some} from '@xh/hoist/core';
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {logWarn, withDefault} from '@xh/hoist/utils/js';
import {composeRefs, getLayoutProps, useOnResize} from '@xh/hoist/utils/react';
import {isArray, isEmpty, omit, pick} from 'lodash';
import type {ReactNode} from 'react';
import {useLayoutEffect, useRef} from 'react';
import {sliderImpl, type SliderImplProps} from './impl/SliderImpl';
import './Slider.scss';

export interface SliderProps extends HoistProps, HoistInputProps, LayoutProps {
    value?: Some<number>;

    /** Color of the track fill. Defaults to `'primary'`. */
    intent?: Intent;

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
 * Some scales cannot be drawn, or would take too long to, so the slider adjusts them. It uses 1 for a `stepSize`
 * of zero or less, and raises a `stepSize` too small for the range. It shows a label at each end
 * only for a `labelStepSize` of zero or less, or one that gives over 1,000 labels. With a `max` not
 * above `min`, it renders disabled. It logs a warning for each change in development mode.
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
        // The slider places its handles once it has measured them, after this effect runs.
        resizeRef = useOnResize(() => fitLabels(boxRef.current));

    // Runs after every render, so a handle label follows its handle as it moves.
    useLayoutEffect(() => fitLabels(boxRef.current));

    model.warnOfScaleChanges(scale.changes);

    // Set default left / right padding. Slider.scss sets the top and bottom padding.
    if (!layoutProps.padding && !layoutProps.paddingLeft) layoutProps.paddingLeft = 20;
    if (!layoutProps.padding && !layoutProps.paddingRight) layoutProps.paddingRight = 20;

    // The handles hold the `slider` role, so they take the accessible name from `domAttrs`. With
    // none, they point at the label FormField renders with an id derived from the input's id.
    const isRange = isArray(model.renderValue),
        nameAttrs = pick(props.domAttrs, HANDLE_NAME_ATTRS),
        handleAttrs = isEmpty(nameAttrs)
            ? {'aria-labelledby': props.id ? `${props.id}-label` : null}
            : nameAttrs;

    const sliderProps: SliderImplProps = {
        value: model.renderValue,

        disabled: props.disabled || scale.disabled,
        intent: withDefault(props.intent, 'primary'),
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
        children: sliderImpl({
            ...sliderProps,
            handleHtmlProps: isRange ? {start: handleAttrs, end: handleAttrs} : handleAttrs
        }),

        ...layoutProps,
        width: withDefault(width, 200),
        className,
        testId: props.testId,
        domAttrs: omit(props.domAttrs, HANDLE_NAME_ATTRS),

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        ref: composeRefs(ref, boxRef, resizeRef)
    });
});

/** `domAttrs` that name the slider, set on its handles and not on the wrapper. */
const HANDLE_NAME_ATTRS = ['aria-label', 'aria-labelledby'];

//-----------------------
// Labels
//-----------------------
/**
 * Shift each label that crosses an edge of the slider back inside it. The slider centers a label
 * on its tick or handle, so a long label at either end of the track runs past the side padding. Only
 * the end labels of the axis and the handle labels can reach an edge. A label that fits keeps its
 * centered place.
 */
function fitLabels(el: HTMLElement) {
    if (!el) return;

    const labels = [
        el.querySelector<HTMLElement>('.bp6-slider-axis > .bp6-slider-label:first-child'),
        el.querySelector<HTMLElement>('.bp6-slider-axis > .bp6-slider-label:last-child'),
        ...Array.from(el.querySelectorAll<HTMLElement>('.bp6-slider-handle .bp6-slider-label'))
    ];

    // Reset every label before measuring, so that no shift is measured as part of a label.
    labels.forEach(label => label?.style.removeProperty('translate'));
    if (el.querySelector('.bp6-slider.bp6-vertical')) return;

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

/** The slider draws a label at each step from `min` until it passes `max` by this much. */
const LABEL_TOLERANCE = 0.00001;

interface SliderScale {
    min: number;
    max: number;
    stepSize: number;
    /** Undefined when `labelValues` is set - the slider takes one or the other. */
    labelStepSize: number;
    labelValues: number[];
    labelPrecision: number;
    /** True when the scale is a stand-in, so the slider must not take input. */
    disabled: boolean;
    /** A sentence for each prop changed, for the developer. */
    changes: string[];
}

/**
 * The scale to hand to the slider. A step of zero or less never advances, and the decimal places
 * of a `stepSize` too small take too long to count. The slider draws a label for each
 * `labelStepSize` in the range, however many, and divides by the range. Returns the props as given
 * for any scale the slider can draw.
 */
function getSafeScale(props: SliderProps): SliderScale {
    const changes: string[] = [],
        min = props.min ?? 0;
    let max = props.max ?? 10,
        stepSize = props.stepSize ?? 1,
        labelStepSize = props.labelStepSize,
        labelValues: number[],
        disabled = false;

    // 1) A range above zero.
    if (max <= min) {
        changes.push(`min ${min} and max ${max} give no range - rendered disabled.`);
        max = min + 1;
        disabled = true;
    }
    const range = max - min;

    // 2) A step above zero, and large enough to tell values in the range apart.
    if (stepSize <= 0) {
        changes.push(`stepSize ${stepSize} is not above zero - used 1.`);
        stepSize = 1;
    }
    if (stepSize < range * MIN_STEP_RATIO) {
        stepSize = range * MIN_STEP_RATIO;
        changes.push(`stepSize ${props.stepSize} is too small for the range - used ${stepSize}.`);
    }

    // 3) A label step above zero, that gives a number of labels a page can hold.
    const labelCount = (range + LABEL_TOLERANCE) / (labelStepSize ?? 1);
    if (
        (labelStepSize != null && labelStepSize <= 0) ||
        (props.labelRenderer !== false && labelCount >= MAX_LABELS)
    ) {
        changes.push(
            `labelStepSize ${labelStepSize ?? 1} gives no labels or over ${MAX_LABELS} - ` +
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
 * Decimal places in a number, to format a default label, with a limit - an unlimited count never
 * ends for a number below about 1e-308.
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
