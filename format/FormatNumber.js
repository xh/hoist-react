/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults, isFinite, isString, isFunction} from 'lodash';
import numbro from 'numbro';

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
 * @param {Object} [opts]
 * @param {string} [opts.nullDisplay] - display string for null values.
 * @param {Object} [opts.formatConfig] - a valid numbro format object.
 * @param {(number|'auto')} [opts.precision] - desired number of decimal places.
 * @param {boolean} [opts.zeroPad] - true to pad with trailing zeros out to given precision.
 * @param {boolean} [opts.ledger] - true to use ledger format.
 * @param {boolean} [opts.forceLedgerAlign] - true to add placeholder after positive ledgers to
 *      align vertically with negative ledgers in columns.
 * @param {boolean} [opts.withPlusSign] - true to prepend positive numbers with a '+'.
 * @param {boolean} [opts.withSignGlyph] - true to prepend an up / down arrow.
 * @param {string} [opts.label] - label to append to value.
 * @param {string} [opts.labelCls] - CSS class of label <span>,
 * @param {(boolean|Object)} [opts.colorSpec] - show in colored <span>, based on sign of value.
 *      True for red/green/grey defaults, or object of the form {pos: color, neg: color, neutral: color}.
 * @param {(boolean|fmtNumber~tooltipFn)} [opts.tooltip] - true to enable default tooltip with
 *      minimally formatted original value, or a function to generate a custom tooltip string.
 * @param {boolean} [opts.asElement] - return a React element rather than a HTML string
 * @param {number} [opts.originalValue] - holds the unaltered original value to be formatted.
 *      Not typically used by applications.
 *
 * This method delegates to numbro, @see http://numbrojs.com for more details.
 *
 * Hierarchy of params is by specificity: formatPattern => precision.
 * If no options are given, a heuristic based auto-rounding will occur.
 */
export function fmtNumber(v, {
    nullDisplay = '',
    formatConfig = null,
    precision = 'auto',
    zeroPad = (precision != 'auto'),
    ledger = false,
    forceLedgerAlign = true,
    withPlusSign = false,
    withSignGlyph = false,
    label = null,
    labelCls = 'xh-units-label',
    colorSpec = null,
    tooltip = null,
    asElement = false,
    originalValue = v
} = {}) {

    if (isInvalidInput(v)) return nullDisplay;

    formatConfig = formatConfig || buildFormatConfig(v, precision, zeroPad);
    let str = numbro(v).format(formatConfig);

    if (ledger || withSignGlyph) str = str.replace('-', '');
    if (withPlusSign && v > 0) {
        str = '+' + str;
    }

    const opts = {str, ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tooltip, originalValue};
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

/**
 * Render a minimally formatted, full precision number, suitable for use in tooltips.
 * Only ledger opt is supported.
 *
 * @param {number} v - value to format.
 * @param {Object} [opts]
 * @param {boolean} [opts.ledger] - true to use ledger format.
 */
export function fmtNumberTooltip(v, {ledger = false} = {}) {
    return fmtNumber(v, {
        ledger,
        forceLedgerAlign: false,
        precision: MAX_NUMERIC_PRECISION,
        zeroPad: false
    });
}

//---------------
// Implementation
//---------------
function fmtNumberElement(v, opts = {}) {
    const {str, ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tooltip} = opts;

    // CSS classes
    const cls = [];
    if (colorSpec) cls.push(valueColor(v, colorSpec));
    if (tooltip) cls.push('xh-title-tip');

    // Compile child items
    const asElement = true,
        items = [];

    if (withSignGlyph) {
        items.push(signGlyph(v, asElement));
    }

    items.push(str);

    if (isString(label)) {
        items.push(labelCls ? fmtSpan(label, {className: labelCls, asElement: asElement}) : label);
    }

    if (ledger) {
        if (v < 0) {
            items.unshift('(');
            items.push(')');
        } else if (forceLedgerAlign) {
            items.push(LEDGER_ALIGN_PLACEHOLDER_EL);
        }

    }

    return span({
        className: cls.join(' '),
        title: processToolTip(tooltip, opts),
        items: items
    });
}

function fmtNumberString(v, opts = {}) {
    const {ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tooltip} = opts;
    let str = opts.str;

    if (withSignGlyph) {
        str = signGlyph(v) + '&nbsp;' + str;
    }

    if (isString(label)) {
        if (labelCls) {
            str += fmtSpan(label, {className: labelCls});
        } else {
            str += label;
        }
    }

    if (ledger) {
        if (v < 0) {
            str = '(' + str + ')';
        } else if (forceLedgerAlign) {
            str += LEDGER_ALIGN_PLACEHOLDER;
        }
    }

    if (colorSpec) {
        str = fmtSpan(str, {className: valueColor(v, colorSpec)});
    }

    if (tooltip) {
        str = fmtSpan(str, {className: 'xh-title-tip', title: processToolTip(tooltip, opts)});
    }

    return str;
}

function signGlyph(v, asElement) {
    if (!isFinite(v)) return '';
    return v === 0 ? fmtSpan(UP_TICK, {className: 'xh-transparent', asElement: asElement}) : v > 0 ? UP_TICK : DOWN_TICK;
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

function buildFormatConfig(v, precision, zeroPad) {
    const num = Math.abs(v);

    const config = {thousandSeparated: num >= 1000};
    let mantissa = undefined;

    if (precision % 1 === 0) {
        precision = precision < MAX_NUMERIC_PRECISION ? precision : MAX_NUMERIC_PRECISION;
        mantissa = precision === 0 ? 0 : precision;
    } else {
        if (num === 0) {
            mantissa = 2;
        } else if (num < .01) {
            mantissa = 6;
        } else if (num < 100) {
            mantissa = 4;
        } else if (num < 10000) {
            mantissa = 2;
        } else {
            mantissa = 0;
        }
    }
    config.mantissa = mantissa;
    config.trimMantissa = !zeroPad && mantissa != 0;
    return config;
}

function isInvalidInput(v) {
    return v == null || v === '';
}

function processToolTip(tooltip, opts) {
    if (tooltip === true) {
        return fmtNumberTooltip(opts.originalValue, opts);
    } else if (isFunction(tooltip)) {
        return tooltip(opts.originalValue);
    } else {
        return null;
    }
}

export const numberRenderer = createRenderer(fmtNumber),
    thousandsRenderer = createRenderer(fmtThousands),
    millionsRenderer = createRenderer(fmtMillions),
    billionsRenderer = createRenderer(fmtBillions),
    quantityRenderer = createRenderer(fmtQuantity),
    priceRenderer = createRenderer(fmtPrice),
    percentRenderer = createRenderer(fmtPercent);

/**
 * @callback fmtNumber~tooltipFn - renderer for a custom tooltip.
 * @param {number} originalValue - number to be formatted.
 * @return {string} - the formatted value for display.
 */
