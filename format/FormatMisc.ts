/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {capitalize, isNil} from 'lodash';
import {ReactNode} from 'react';

export interface FormatOptions<T = any> {
    /** Display value for null values. */
    nullDisplay?: ReactNode;

    /** Function to generate a tooltip string. */
    tooltip?:  (v: T) => string;

    /** Return an HTML string rather than a React element (default false).*/
    asHtml?: boolean;

    /** The unaltered original value to be formatted. Not typically used by applications.*/
    originalValue?: T;
}


export interface SpanFormatOptions extends FormatOptions {
    className?: string;
    title?: string;

    /** Set to true to add a space before the v to be wrapped.*/
    leadSpc?: boolean;

    /** Set to true to add a space after the span to be returned. */
    trailSpc?: boolean;
}

/**
 * Wrap values in a custom span
 *
 * @param v - value to be placed in span, will be coerced into a string
 * @param opts - an options object
 */
export function fmtSpan(v: any, opts?: SpanFormatOptions): ReactNode {
    const {
        className = null,
        title = null,
        leadSpc = false,
        trailSpc = false,
        asHtml = false
    } = opts ?? {};
    if (v == null) return '';
    let delOpts = {className, title, leadSpc, trailSpc};
    return asHtml ? fmtSpanHtml(v, delOpts) : fmtSpanElement(v, delOpts);
}

export interface JSONFormatOptions {
    /** Method or array pattern for replacing/skipping nodes to pass to `stringify` */
    replacer?: any;

    /** Indentation amount to pass to `stringify`*/
    space?: number|string;
}

/**
 * Pretty-print a JSON string, adding line breaks and indentation.
 */
export function fmtJson(str: string, opts?: JSONFormatOptions): string {
    const {replacer = undefined, space = 2} = opts ?? {};
    return isNil(str) ?
        '' :
        JSON.stringify(JSON.parse(str), replacer, space);
}

/**
 * Basic util for splitting a string (via ' ') and capitalizing each word - e.g. for names.
 * Not intended to handle more advanced usages such as HTML or other word boundary characters.
 */
export function capitalizeWords(str: string): string {
    if (str == null || !str.length) return str;
    return str.split(' ')
        .map(s => capitalize(s))
        .join(' ');
}


//-----------------
// Implementation
//-----------------
function fmtSpanElement(v, opts) {
    const {className, title, leadSpc, trailSpc} = opts,
        txt = (leadSpc ? ' ' : '') + v + (trailSpc ? ' ' : '');

    return span({
        className,
        title,
        item: txt
    });
}

function fmtSpanHtml(v, opts) {
    const {className, title, leadSpc, trailSpc} = opts,
        txt = (leadSpc ? ' ' : '') + v;

    let ret = '<span';
    ret += className ? ` class="${className}"` : '';
    ret += title ? ` title="${title}"` : '';
    ret += `>${txt}</span>`;

    return trailSpc ? ret + ' ' : ret;
}
