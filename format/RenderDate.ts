/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';
import {ReactNode} from 'react';
import {DateLike, PlainObject} from '../core/types/Types';
import {fmtCompactDate, fmtDate, fmtDateTime, fmtDateTimeSec, fmtTime} from './FormatDate';
import {createRenderer, type TextRenderer} from './FormatUtils';

/**
 * Renderer factories over {@link fmtDate} and friends, for `Column.renderer`. Each takes the
 * options of its format function and returns a function of the value alone.
 */
export const dateRenderer = createRenderer(fmtDate),
    dateTimeRenderer = createRenderer(fmtDateTime),
    dateTimeSecRenderer = createRenderer(fmtDateTimeSec),
    timeRenderer = createRenderer(fmtTime),
    compactDateRenderer = createRenderer(fmtCompactDate);

/**
 * Text-returning counterparts of {@link dateRenderer} and friends, for `Column.textRenderer`.
 * ag-Grid writes their output into the cell as text.
 */
export const dateTextRenderer = createDateTextRenderer(fmtDate),
    dateTimeTextRenderer = createDateTextRenderer(fmtDateTime),
    dateTimeSecTextRenderer = createDateTextRenderer(fmtDateTimeSec),
    timeTextRenderer = createDateTextRenderer(fmtTime),
    compactDateTextRenderer = createDateTextRenderer(fmtCompactDate);

//---------------
// Implementation
//---------------
function createDateTextRenderer<O extends PlainObject | string>(
    fmt: (v: DateLike, opts?: O) => ReactNode
): (opts?: WithoutMarkup<Exclude<O, string>> | Extract<O, string>) => TextRenderer<DateLike> {
    return opts => {
        const fmtOpts = isString(opts) ? {fmt: opts} : {...(opts as PlainObject)};
        return v => fmt(v, fmtOpts as O) as string;
    };
}

/**
 * Options of a text renderer: those of its format function, less the options that need markup,
 * which are typed `never`.
 */
type WithoutMarkup<O> = Omit<O, 'tooltip' | 'asHtml' | 'nullDisplay' | 'originalValue'> & {
    /** Display value for null values. */
    nullDisplay?: string;

    /** Not supported - set `Column.tooltip` instead. */
    tooltip?: never;

    /** Not supported - a text renderer always returns plain text. */
    asHtml?: never;
};
