/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {Intent} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import classNames from 'classnames';
import {clamp, isArray, isFunction} from 'lodash';
import type {CSSProperties, KeyboardEvent, PointerEvent, ReactNode} from 'react';
import {createElement as h, useLayoutEffect, useRef, useState} from 'react';

export interface SliderImplProps {
    /** A number for a single handle, or a pair for a range. */
    value: number | [number, number];
    onChange?: (value: number | [number, number]) => void;
    onRelease?: (value: number | [number, number]) => void;
    className?: string;
    disabled?: boolean;
    /** Attributes for the handle, or `{start, end}` for the two handles of a range. */
    handleHtmlProps?: Record<string, any>;
    intent?: Intent | 'none';
    labelPrecision?: number;
    labelRenderer?: boolean | ((value: number, opts?: {isHandleTooltip: boolean}) => ReactNode);
    labelStepSize?: number;
    labelValues?: number[];
    max?: number;
    min?: number;
    showTrackFill?: boolean;
    stepSize?: number;
    vertical?: boolean;
}

/**
 * A single or range slider, dragged by pointer or stepped by the WAI-ARIA slider keys, including
 * Home/End and PageUp/PageDown.
 * @internal
 */
export const sliderImpl = hoistCmp.factory<SliderImplProps>({
    displayName: 'SliderImpl',
    model: false,
    observer: false,

    render(props) {
        const {
            className,
            disabled = false,
            handleHtmlProps,
            intent,
            labelPrecision,
            labelRenderer,
            labelStepSize,
            labelValues,
            max = 10,
            min = 0,
            onChange,
            onRelease,
            showTrackFill = true,
            stepSize = 1,
            value,
            vertical = false
        } = props;

        const isRange = isArray(value),
            values: number[] = isRange ? (value as number[]) : [(value as number) ?? min],
            range = max - min,
            precision = labelPrecision ?? countDecimalPlaces(stepSize),
            trackRef = useRef<HTMLDivElement>(null),
            handleRefs = useRef<HTMLSpanElement[]>([]),
            [dragIdx, setDragIdx] = useState<number>(null),
            [handleMid, setHandleMid] = useState(8);

        // Offset handles by half their cross-axis size, measured once rendered. A full handle is
        // square, so this centers it. Range handles are half-width, so this sets each flush against
        // its value - the end handle's CSS margin moves it to the far side.
        useLayoutEffect(() => {
            const el = handleRefs.current[0];
            if (el) setHandleMid((vertical ? el.offsetWidth : el.offsetHeight) / 2 || 8);
        }, [vertical]);

        //------------------------
        // Value changes
        //------------------------
        const snap = (v: number) =>
                clamp(min + Math.round((v - min) / stepSize) * stepSize, min, max),
            // A range handle stops at the other handle rather than crossing it.
            boundsFor = (idx: number): [number, number] =>
                !isRange ? [min, max] : idx === 0 ? [min, values[1]] : [values[0], max];

        const setValueAt = (idx: number, raw: number) => {
            const [lo, hi] = boundsFor(idx),
                next = clamp(roundTo(snap(raw), precision + 2), lo, hi);
            if (next === values[idx] || isNaN(next)) return;
            if (isRange) {
                const ret = [...values] as [number, number];
                ret[idx] = next;
                onChange?.(ret);
            } else {
                onChange?.(next);
            }
        };

        const release = () => onRelease?.(isRange ? (values as [number, number]) : values[0]);

        const valueFromPointer = (e: PointerEvent) => {
            const rect = trackRef.current.getBoundingClientRect(),
                ratio = vertical
                    ? (rect.bottom - e.clientY) / rect.height
                    : (e.clientX - rect.left) / rect.width;
            return min + clamp(ratio, 0, 1) * range;
        };

        //------------------------
        // Pointer - press on a handle drags it; press on the track moves the nearest handle there.
        //------------------------
        const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
            if (disabled || e.button !== 0) return;
            const v = valueFromPointer(e),
                onHandle = handleRefs.current.findIndex(it => it?.contains(e.target as Node)),
                idx =
                    onHandle >= 0
                        ? onHandle
                        : values.length === 1 || Math.abs(v - values[0]) <= Math.abs(v - values[1])
                          ? 0
                          : 1;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            handleRefs.current[idx]?.focus();
            setDragIdx(idx);
            if (onHandle < 0) setValueAt(idx, v);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (dragIdx != null) setValueAt(dragIdx, valueFromPointer(e));
        };

        const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
            if (dragIdx == null) return;
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDragIdx(null);
            release();
        };

        //------------------------
        // Keyboard
        //------------------------
        const onHandleKeyDown = (idx: number, e: KeyboardEvent) => {
            const v = values[idx],
                bigStep = Math.max(stepSize, labelStepSize ?? range / 10),
                [lo, hi] = boundsFor(idx),
                next = {
                    ArrowRight: v + stepSize,
                    ArrowUp: v + stepSize,
                    ArrowLeft: v - stepSize,
                    ArrowDown: v - stepSize,
                    PageUp: v + bigStep,
                    PageDown: v - bigStep,
                    Home: lo,
                    End: hi
                }[e.key];
            if (next === undefined) return;
            e.preventDefault();
            setValueAt(idx, next);
        };

        //------------------------
        // Render
        //------------------------
        const ratioOf = (v: number) => clamp((v - min) / range, 0, 1),
            pct = (r: number) => `${(r * 100).toFixed(4)}%`,
            formatLabel = (v: number, isHandleTooltip: boolean): ReactNode =>
                labelRenderer === false
                    ? undefined
                    : isFunction(labelRenderer)
                      ? labelRenderer(v, {isHandleTooltip})
                      : v.toFixed(precision);

        // Track segments between min, each handle, and max. The filled one carries the intent.
        const stops = [min, ...values, max],
            fillIdx = isRange ? 1 : 0,
            tracks = stops.slice(0, -1).map((start, i) => {
                const s = pct(ratioOf(start)),
                    eRatio = pct(1 - ratioOf(stops[i + 1])),
                    style: CSSProperties = vertical
                        ? {bottom: s, top: eRatio, left: 0}
                        : {left: s, right: eRatio, top: 0};
                return h('div', {
                    key: `track-${i}`,
                    className: classNames(
                        'xh-slider__progress',
                        showTrackFill && i === fillIdx && intent && intent !== 'none'
                            ? `xh-slider__progress--intent-${intent}`
                            : null
                    ),
                    style
                });
            });

        const axisLabels =
            labelRenderer === false
                ? null
                : (labelValues ?? stepsFrom(min, max, labelStepSize ?? 1)).map((v, i) =>
                      h(
                          'div',
                          {
                              key: i,
                              className: 'xh-slider__label',
                              style: vertical ? {bottom: pct(ratioOf(v))} : {left: pct(ratioOf(v))}
                          },
                          formatLabel(v, false)
                      )
                  );

        const handles = values.map((v, idx) => {
            const htmlProps = isRange
                    ? handleHtmlProps?.[idx === 0 ? 'start' : 'end']
                    : handleHtmlProps,
                [lo, hi] = boundsFor(idx),
                label = formatLabel(v, true),
                offset = `calc(${pct(ratioOf(v))} - ${handleMid}px)`;
            return h(
                'span',
                {
                    key: idx,
                    ref: (el: HTMLSpanElement) => (handleRefs.current[idx] = el),
                    role: 'slider',
                    tabIndex: disabled ? -1 : 0,
                    ...htmlProps,
                    className: classNames('xh-slider__handle', {
                        'xh-slider__handle--start': isRange && idx === 0,
                        'xh-slider__handle--end': isRange && idx === 1,
                        'xh-slider__handle--active': dragIdx === idx
                    }),
                    style: vertical ? {bottom: offset} : {left: offset},
                    'aria-valuemin': lo,
                    'aria-valuemax': hi,
                    'aria-valuenow': v,
                    'aria-valuetext': typeof label === 'string' ? label : undefined,
                    'aria-disabled': disabled,
                    'aria-orientation': vertical ? 'vertical' : 'horizontal',
                    onKeyDown: disabled ? undefined : e => onHandleKeyDown(idx, e),
                    onKeyUp: disabled ? undefined : release
                },
                label == null ? null : h('span', {className: 'xh-slider__label'}, label)
            );
        });

        return h(
            'div',
            {
                className: classNames(
                    'xh-slider__body',
                    {
                        'xh-slider__body--disabled': disabled,
                        'xh-slider__body--unlabeled': labelRenderer === false,
                        'xh-slider__body--vertical': vertical
                    },
                    className
                ),
                style: {touchAction: 'none'},
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onPointerCancel: onPointerUp
            },
            h('div', {className: 'xh-slider__track', ref: trackRef}, tracks),
            h('div', {className: 'xh-slider__axis'}, axisLabels),
            handles
        );
    }
});

//------------------------
// Implementation
//------------------------
function stepsFrom(min: number, max: number, step: number): number[] {
    const ret = [];
    for (let v = min; v < max || Math.abs(v - max) < 1e-5; v += step) ret.push(v);
    return ret;
}

function roundTo(v: number, places: number): number {
    const e = Math.pow(10, Math.min(places, 15));
    return Math.round(v * e) / e;
}

function countDecimalPlaces(num: number): number {
    let e = 1,
        places = 0;
    while (places < 20 && Math.round(num * e) / e !== num) {
        e *= 10;
        places++;
    }
    return places;
}
