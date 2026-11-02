/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';
import {ReactNode} from 'react';
import {DateLike, PlainObject} from '../core/types/Types';
import {
    CompactDateFormatOptions,
    DateFormatOptions,
    fmtCompactDate,
    fmtDate,
    fmtDateTime,
    fmtDateTimeSec,
    fmtTime
} from './FormatDate';
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

/**
 * Options of {@link dateTextRenderer} and friends: those of the format function, less the options
 * that need markup, which are typed `never`.
 */
export type DateTextRendererOptions<O extends PlainObject = DateFormatOptions> = Omit<
    O,
    'tooltip' | 'asHtml' | 'nullDisplay' | 'originalValue'
> & {
    /** Display value for null values. */
    nullDisplay?: string;

    /** Not supported - set `Column.tooltip` instead. */
    tooltip?: never;

    /** Not supported - a text renderer always returns plain text. */
    asHtml?: never;
};

/** Options of {@link compactDateTextRenderer}. */
export type CompactDateTextRendererOptions = DateTextRendererOptions<CompactDateFormatOptions>;

//---------------
// Implementation
//---------------
function createDateTextRenderer<O extends PlainObject | string>(
    fmt: (v: DateLike, opts?: O) => ReactNode
): (
    opts?: DateTextRendererOptions<Exclude<O, string>> | Extract<O, string>
) => TextRenderer<DateLike> {
    return opts => {
        const fmtOpts = isString(opts) ? {fmt: opts} : {...(opts as PlainObject)};
        return v => fmt(v, fmtOpts as O) as string;
    };
}
