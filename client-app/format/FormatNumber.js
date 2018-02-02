/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults, isFinite, isString} from 'lodash';
import numeral from 'numeral';

import {XH} from 'hoist/exception/Exception';

import {createRenderer, saveOriginal} from './FormatUtils';
import {fmtSpan} from './FormatMisc';

const THOUSAND = 1000,
    MILLION  = 1000000,
    BILLION  = 1000000000,
    MAX_NUMERIC_PRECISION = 12;

const UP_TICK = '&#9652;',
    DOWN_TICK = '&#9662;',
    LEDGER_ALIGN_PLACEHOLDER = '<span style="visibility:hidden">)</span>';

/**
 * Standard number formatting for Hoist
 *
 * @param v - int or float to format
 * @param opts formatting options, may include:
 *      @param nullDisplay - desired display for null values, defaults to an empty string
 *      @param formatPattern - string to specify a desired format
 *      @param precision - integer for desired decimal places
 *      @param zeroPad - boolean, pad with trailing zeros
 *      @param ledger - boolean, use ledger format
 *      @param forceLedgerAlign - boolean, add placeholder after positive ledgers to align with negative ledgers in columns
 *      @param withPlusSign - boolean, use to include a '+' in positive number strings
 *      @param withSignGlyph - boolean, prepend with an up / down arrow
 *      @param label - string, label to append to value
 *      @param labelCls - class to apply to label span, defaults to 'xh-units-label'
 *      @param colorSpec - show in colored <span>, based on sign of value. If truthy will default to red/green/grey
 *                         also accepts an object of the form {pos: color, neg: color, neutral: color}
 *      @param tipFn - function, use to place formatted number in span with title property set to returned string
 *                               will be passed the originalValue param
 *      @param originalValue - used to retain an unaltered reference to the original value to be formatted.
 *                             Not typically used by applications.
 *
 * This method delegates to numberFormatter, see that package for more details.
 *
 * Hierarchy of params is by specificity: formatPattern => precision
 * If no options are given, a heuristic based auto-rounding will occur
 */

export function fmtNumber(v, {
    nullDisplay = '',
    formatPattern = null,
    precision = 'auto',
    zeroPad = true,
    ledger = false,
    forceLedgerAlign = true,
    withPlusSign = false,
    withSignGlyph = false,
    label = null,
    labelCls = 'xh-units-label',
    colorSpec = null,
    tipFn = null,
    originalValue = v
} = {}) {

    if (isInvalidInput(v)) return nullDisplay;

    formatPattern = formatPattern || buildFormatPattern(v, precision, zeroPad);

    let ret = numeral(v).format(formatPattern);

    if (ledger || withSignGlyph) ret = ret.replace('-', '');

    if (withPlusSign && v > 0) {
        ret = '+' + ret;
    }

    if (isString(label)) {
        if (labelCls) {
            ret += fmtSpan(label, {cls: labelCls});
        } else {
            ret += label;
        }
    }

    if (withSignGlyph) {
        ret = signGlyph(v) + '&nbsp;' + ret;
    }

    if (ledger) {
        const plcHolder = forceLedgerAlign ? LEDGER_ALIGN_PLACEHOLDER : '';
        ret = v < 0 ? '(' + ret + ')' : ret + plcHolder;
    }

    if (colorSpec) {
        ret = fmtSpan(ret, {cls: valueColor(v, colorSpec)});
    }

    if (tipFn) {
        ret = fmtSpan(ret, {cls: 'xh-title-tip', title: tipFn(originalValue)});
    }

    return ret;
}

/**
 * Render number in thousands.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function fmtThousands(v, opts = {})  {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);
    v = v / THOUSAND;
    if (opts.label === true) opts.label = 'k';
    return fmtNumber(v, opts);
}

/**
 * Render number in millions.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function fmtMillions(v, opts = {})  {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = v / MILLION;
    if (opts.label === true) opts.label = 'm';
    return fmtNumber(v, opts);
}


/**
 * Render number in billions.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function fmtBillions(v, opts = {})  {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = v / BILLION;
    if (opts.label === true) opts.label = 'b';
    return fmtNumber(v, opts);
}

/**
 * Render a quantity value, handling highly variable amounts by using 2dp millions for values > 1m
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function fmtQuantity(v, opts = {}) {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    const lessThanM = Math.abs(v) < MILLION;

    defaults(opts, {
        ledger: true,
        label: true,
        precision: lessThanM ? 0 : 2
    });

    return lessThanM ? fmtNumber(v, opts) : fmtMillions(v, opts);
}

/**
 * Render market price
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function fmtPrice(v, opts = {}) {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    if (opts.precision === undefined) {
        const absVal = Math.abs(v);
        opts.precision = absVal < 1000 && absVal !== 0 ? 2 : 0;
    }

    return fmtNumber(v, opts);
}

/**
 * Render a number as a percent
 *
 * @param v - int or float to format,
 * @param opts - see number() method - may also include:
 *          withParens, surround return with parenthesis
 */
export function fmtPercent(v, opts = {}) {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    defaults(opts, {precision: 2, label: '%', labelCls: null});

    let ret = fmtNumber(v, opts);
    if (opts.withParens) ret = '(' + ret + ')';
    return ret;
}

//---------------
// Implementation
//---------------

function signGlyph(v) {
    if (isFinite(v)) return '';
    return v === 0 ? fmtSpan(UP_TICK, 'transparent-color') :  v > 0 ? UP_TICK : DOWN_TICK;
}

function valueColor(v, colorSpec) {
    if (!isFinite(v)) return '';

    const defaultColors = {pos: 'green', neg: 'red', neutral: 'gray'};
    colorSpec = typeof colorSpec === 'object' ? colorSpec : defaultColors;

    if (!colorSpec.pos || !colorSpec.neg || !colorSpec.neutral) {
        throw XH.exception('Invalid color spec: ' + colorSpec);
    }

    if (v < 0) return colorSpec.neg;
    if (v > 0) return colorSpec.pos;

    return colorSpec.neutral;
}

function buildFormatPattern(v, precision, zeroPad) {
    const num = Math.abs(v);

    let pattern = '';

    if (precision % 1 === 0) {
        precision = precision < MAX_NUMERIC_PRECISION ? precision : MAX_NUMERIC_PRECISION;
        pattern = precision === 0 ? '0,0' : '0,0.' + '0'.repeat(precision);
    } else {
        if (num === 0) {
            pattern = '0.00';
        } else if (num < .01) {
            pattern = '0,0.000000';
        } else if (num < 100) {
            pattern = '0,0.0000';
        } else if (num < 10000) {
            pattern = '0,0.00';
        } else {
            pattern = '0,0';
        }
    }

    if (!zeroPad) {
        const arr = pattern.split('.');
        if (arr[1]) arr[1] = `[${arr[1]}]`;
        pattern = arr.join('.');
    }

    return pattern;
}

function isInvalidInput(v) {
    return v == null || v === '';
}

export const numberRenderer = createRenderer(fmtNumber),
    thousandsRenderer = createRenderer(fmtThousands),
    millionsRenderer = createRenderer(fmtMillions),
    billionsRenderer = createRenderer(fmtBillions),
    quantityRenderer = createRenderer(fmtQuantity),
    priceRenderer = createRenderer(fmtPrice),
    percentRenderer = createRenderer(fmtPercent);