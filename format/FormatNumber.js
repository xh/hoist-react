/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults, isFinite, isString} from 'lodash';
import numeral from 'numeral';

import {Exception} from '@xh/hoist/exception';
import {span} from '@xh/hoist/cmp/layout';

import {createRenderer, saveOriginal} from './FormatUtils';
import {fmtSpan} from './FormatMisc';

const THOUSAND = 1000,
    MILLION  = 1000000,
    BILLION  = 1000000000,
    MAX_NUMERIC_PRECISION = 12;

const UP_TICK = '▴',
    DOWN_TICK = '▾',
    LEDGER_ALIGN_PLACEHOLDER = '<span style="visibility:hidden">)</span>',
    LEDGER_ALIGN_PLACEHOLDER_EL = span({style: {visibility: 'hidden'}, item: ')'});

/**
 * Standard number formatting for Hoist
 *
 * @param {number} v - value to format.
 * @param {Object} [opts] - formatting options, may include:
 * @param {string} [opts.nullDisplay] - desired display for null values.
 * @param {string} [opts.formatPattern] - a valid numeralJS format string.
 *      @see http://numeraljs.com/#format for more info
 * @param {(number|'auto')} [opts.precision] - desired number of decimal places.
 * @param {boolean} [opts.zeroPad] - set to false to remove trailing zeros regardless of precision.
 * @param {boolean} [opts.ledger] - set to true to use ledger format.
 * @param {boolean} [opts.forceLedgerAlign] - used to add placeholder after positive ledgers to align with negative ledgers in columns.
 * @param {boolean} [opts.withPlusSign] - set to true to include a '+' in positive number strings.
 * @param {boolean} [opts.withSignGlyph] - set to true to prepend with an up / down arrow.
 * @param {string} [opts.label] - label to append to value.
 * @param {string} [opts.labelCls] - if provided, label will be place in a span with this set as its class.
 * @param {(boolean|Object)} [opts.colorSpec] - show in colored <span>, based on sign of value.
 *      If truthy will default to red/green/grey. Also accepts an object of the form {pos: color, neg: color, neutral: color}.
 * @param {function} [opts.tipFn] - use to place formatted number in span with title property set to returned string.
 *      Will be passed the originalValue param.
 * @param {boolean} [opts.asElement] - return a react element rather than a html string
 * @param {number} [opts.originalValue] - used to retain an unaltered reference to the original value to be formatted.
 *      Not typically used by applications.
 *
 * This method delegates to numeralJS, @see http://numeraljs.com for more details.
 *
 * Hierarchy of params is by specificity: formatPattern => precision.
 * If no options are given, a heuristic based auto-rounding will occur.
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
    asElement = false,
    originalValue = v
} = {}) {

    if (isInvalidInput(v)) return nullDisplay;

    // Format text
    formatPattern = formatPattern || buildFormatPattern(v, precision, zeroPad);
    let str = numeral(v).format(formatPattern);

    if (ledger || withSignGlyph) str = str.replace('-', '');
    if (ledger) str = v < 0 ? '(' + str + ')' : str;
    if (withPlusSign && v > 0) {
        str = '+' + str;
    }

    const opts = {str, ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tipFn, originalValue};
    return asElement ? fmtNumberElement(v, opts) : fmtNumberString(v, opts);
}

/**
 * Render number in thousands.
 *
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
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
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
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
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
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
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
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
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
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
 * @param {number} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtPercent(v, opts = {}) {
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    defaults(opts, {precision: 2, label: '%', labelCls: null});
    return fmtNumber(v, opts);
}

//---------------
// Implementation
//---------------
function fmtNumberElement(v, opts = {}) {
    const {str, ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tipFn, originalValue} = opts;

    // CSS classes
    const cls = [];
    if (colorSpec) cls.push(valueColor(v, colorSpec));
    if (tipFn) cls.push('xh-title-tip');

    // Compile child items
    const asElement = true,
        items = [];

    if (withSignGlyph) {
        items.push(signGlyph(v, asElement));
    }

    items.push(str);

    if (isString(label)) {
        items.push(labelCls ? fmtSpan(label, {cls: labelCls, asElement: asElement}) : label);
    }
    if (v >= 0 && ledger && forceLedgerAlign) {
        items.push(LEDGER_ALIGN_PLACEHOLDER_EL);
    }

    return span({
        cls: cls.join(' '),
        title: tipFn ? tipFn(originalValue) : null,
        items: items
    });
}

function fmtNumberString(v, opts = {}) {
    const {ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tipFn, originalValue} = opts;
    let str = opts.str;

    if (isString(label)) {
        if (labelCls) {
            str += fmtSpan(label, {cls: labelCls});
        } else {
            str += label;
        }
    }

    if (withSignGlyph) {
        str = signGlyph(v) + '&nbsp;' + str;
    }

    if (v >= 0 && ledger && forceLedgerAlign) {
        str += LEDGER_ALIGN_PLACEHOLDER;
    }

    if (colorSpec) {
        str = fmtSpan(str, {cls: valueColor(v, colorSpec)});
    }

    if (tipFn) {
        str = fmtSpan(str, {cls: 'xh-title-tip', title: tipFn(originalValue)});
    }

    return str;
}

function signGlyph(v, asElement) {
    if (!isFinite(v)) return '';
    return v === 0 ? fmtSpan(UP_TICK, {cls: 'xh-transparent', asElement: asElement}) : v > 0 ? UP_TICK : DOWN_TICK;
}

function valueColor(v, colorSpec) {
    if (!isFinite(v)) return '';

    const defaultColors = {pos: 'xh-green', neg: 'xh-red', neutral: 'xh-gray'};
    colorSpec = typeof colorSpec === 'object' ? colorSpec : defaultColors;

    if (!colorSpec.pos || !colorSpec.neg || !colorSpec.neutral) {
        throw Exception.create('Invalid color spec: ' + colorSpec);
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