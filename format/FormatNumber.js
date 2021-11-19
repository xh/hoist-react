/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {defaults, isFinite, isFunction, isPlainObject, isString} from 'lodash';
import numbro from 'numbro';
import BigNumber from 'bignumber.js';
import {apiDeprecated} from '../utils/js';
import {fmtSpan} from './FormatMisc';
import {createRenderer, saveOriginal} from './FormatUtils';

const THOUSAND = 1000,
    MILLION  = 1000000,
    BILLION  = 1000000000,
    MAX_NUMERIC_PRECISION = 12;

const UP_TICK = '▴',
    DOWN_TICK = '▾',
    LEDGER_ALIGN_PLACEHOLDER = '<span style="visibility:hidden">)</span>',
    LEDGER_ALIGN_PLACEHOLDER_EL = span({style: {visibility: 'hidden'}, item: ')'}),
    DEFAULT_COLOR_SPEC = {pos: 'xh-pos-val', neg: 'xh-neg-val', neutral: 'xh-neutral-val'};

/**
 * Standard number formatting for Hoist
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts]
 * @param {string} [opts.nullDisplay] - display string for null values.
 * @param {Object} [opts.formatConfig] - @deprecated - a valid numbro format object.
 * @param {(number|'auto')} [opts.precision] - desired number of decimal places.
 * @param {boolean} [opts.zeroPad] - true to pad with trailing zeros out to given precision.
 * @param {boolean} [opts.ledger] - true to use ledger format.
 * @param {boolean} [opts.forceLedgerAlign] - true to add placeholder after positive ledgers to
 *      align vertically with negative ledgers in columns.
 * @param {boolean} [opts.withPlusSign] - true to prepend positive numbers with a '+'.
 * @param {boolean} [opts.withSignGlyph] - true to prepend an up / down arrow.
 * @param {boolean} [opts.withCommas] - true to include comma delimiters.
 * @param {boolean} [opts.omitFourDigitComma] - set this to true to omit comma if value has exactly
 *      4 digits (i.e. 1500 instead of 1,500).
 * @param {string?} [opts.prefix] - prefix to prepend to value (between the number and its sign).
 * @param {string?} [opts.label] - label to append to value.
 * @param {string} [opts.labelCls] - CSS class of label <span>,
 * @param {(boolean|fmtNumber~ColorSpec)} [opts.colorSpec] - color output based on the sign of the
 *      value. True to use red/green/grey defaults, or provide an object with alternate CSS classes.
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
    /** @deprecated */
    formatConfig = null,
    precision = 'auto',
    zeroPad = (precision !== 'auto'),
    ledger = false,
    forceLedgerAlign = true,
    withPlusSign = false,
    withSignGlyph = false,
    withCommas = true,
    omitFourDigitComma = false,
    prefix = null,
    label = null,
    labelCls = 'xh-units-label',
    colorSpec = false,
    tooltip = null,
    asElement = false,
    originalValue = v
} = {}) {

    if (isInvalidInput(v)) return nullDisplay;

    let str = '';
    if (formatConfig) {
        apiDeprecated('formatConfig', {msg: `Formatting via Numbro will soon be removed.`, v: 'v45'});
        str = numbro(v).format(formatConfig).replace('-', '');
    } else {
        let BN = buildBNInstance(v, precision, zeroPad, withCommas, omitFourDigitComma),
            dp = BN.config().DECIMAL_PLACES;
        BN = BN(v).abs();
        str = zeroPad ? BN.toFormat(dp) : BN.dp(dp).toFormat();
    }

    let sign = null;

    if (v > 0 && withPlusSign) {
        sign = '+';
    } else if (v < 0 && !ledger) {
        sign = '-';
    }

    const opts = {str, sign, ledger, forceLedgerAlign, withSignGlyph, prefix, label, labelCls, colorSpec, tooltip, originalValue};
    return asElement ? fmtNumberElement(v, opts) : fmtNumberString(v, opts);
}

/**
 * Render number in thousands.
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtThousands(v, opts)  {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);
    v = BigNumber(v).dividedBy(THOUSAND);
    if (opts.label === true) opts.label = 'k';
    return fmtNumber(v, opts);
}

/**
 * Render number in millions.
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtMillions(v, opts)  {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = BigNumber(v).dividedBy(MILLION);
    if (opts.label === true) opts.label = 'm';
    return fmtNumber(v, opts);
}


/**
 * Render number in billions.
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtBillions(v, opts)  {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = BigNumber(v).dividedBy(BILLION);
    if (opts.label === true) opts.label = 'b';
    return fmtNumber(v, opts);
}

/**
 * Render a quantity value, handling highly variable amounts by using 2dp millions for values > 1m
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtQuantity(v, opts = {}) {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = BigNumber(v);
    const lessThanM = v.abs().lt(MILLION);

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
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtPrice(v, opts) {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = BigNumber(v);
    if (opts.precision === undefined) {
        const absVal = v.abs();
        opts.precision = absVal.lt(1000) && !absVal.eq(0) ? 2 : 0;
    }

    return fmtNumber(v, opts);
}

/**
 * Render a number as a percent. Value will be multiplied by 100 to calculated the percentage.
 * This behavior purposefully matches Microsoft Excel's percentage formatting.
 *
 * @param {(number|string|BigNumber)} v - value to format.
 * @param {Object} [opts] - @see {@link fmtNumber} method.
 */
export function fmtPercent(v, opts = {}) {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    defaults(opts, {precision: 2, label: '%', labelCls: null});
    return fmtNumber(BigNumber(v).times(100), opts);
}

/**
 * Render a minimally formatted, full precision number, suitable for use in tooltips.
 * Only ledger opt is supported.
 *
 * @param {(number|string|BigNumber)} v - value to format.
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
    const {str, sign, ledger, forceLedgerAlign, withSignGlyph, prefix, label, labelCls, colorSpec, tooltip} = opts;

    // CSS classes
    const cls = [];
    if (colorSpec) cls.push(valueColor(v, colorSpec));
    if (tooltip) cls.push('xh-title-tip');

    // Compile child items
    const asElement = true,
        items = [];

    if (withSignGlyph) {
        items.push(signGlyph(v, asElement));
    } else if (sign) {
        items.push(sign);
    }

    if (isString(prefix)) {
        items.push(prefix);
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
    const {str, sign, ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tooltip, prefix} = opts;
    let ret = '';

    if (withSignGlyph) {
        ret += signGlyph(v) + '&nbsp;';
    } else if (sign) {
        ret += sign;
    }

    if (isString(prefix)) {
        ret += prefix;
    }

    ret += str;

    if (isString(label)) {
        if (labelCls) {
            ret += fmtSpan(label, {className: labelCls});
        } else {
            ret += label;
        }
    }

    if (ledger) {
        if (v < 0) {
            ret = '(' + ret + ')';
        } else if (forceLedgerAlign) {
            ret += LEDGER_ALIGN_PLACEHOLDER;
        }
    }

    if (colorSpec) {
        ret = fmtSpan(ret, {className: valueColor(v, colorSpec)});
    }

    if (tooltip) {
        ret = fmtSpan(ret, {className: 'xh-title-tip', title: processToolTip(tooltip, opts)});
    }

    return ret;
}

function signGlyph(v, asElement) {
    if (!isFinite(v)) return '';
    return v === 0 ? fmtSpan(UP_TICK, {className: 'xh-transparent', asElement: asElement}) : v > 0 ? UP_TICK : DOWN_TICK;
}

function valueColor(v, colorSpec) {
    if (!isFinite(v) || !colorSpec) return '';

    colorSpec = isPlainObject(colorSpec) ? colorSpec : DEFAULT_COLOR_SPEC;
    if (v < 0) return colorSpec.neg;
    if (v > 0) return colorSpec.pos;
    return colorSpec.neutral;
}

function buildBNInstance(v, precision, zeroPad, withCommas, omitFourDigitComma) {
    const num = BigNumber(v).abs(),
        format = BigNumber.config().FORMAT;  // the default BigNumber format

    let mantissa = undefined;

    if (precision % 1 === 0) {
        precision = precision < MAX_NUMERIC_PRECISION ? precision : MAX_NUMERIC_PRECISION;
        mantissa = precision === 0 ? 0 : precision;
    } else {
        if (num.eq(0)) {
            mantissa = 2;
        } else if (num.lt(.01)) {
            mantissa = 6;
        } else if (num.lt(100)) {
            mantissa = 4;
        } else if (num.lt(10000)) {
            mantissa = 2;
        } else {
            mantissa = 0;
        }
    }

    const useCommas = withCommas &&
        !(omitFourDigitComma && num.lt(10000) && (mantissa === 0 || (!zeroPad && num.isInteger())));
    format.groupSeparator = useCommas ? ',' : '';

    return BigNumber.clone({DECIMAL_PLACES: mantissa, FORMAT: format });
}

function isInvalidInput(v) {
    return v == null || v === '';
}

function processToolTip(tooltip, opts) {
    if (tooltip === true) return fmtNumberTooltip(opts.originalValue, opts);
    if (isFunction(tooltip)) return tooltip(opts.originalValue);
    return null;
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

/**
 * @typedef fmtNumber~ColorSpec - config for pos/neg/neutral color classes.
 * @property {string} [pos] - CSS color class to wrap around values > 0.
 * @property {string} [neg] - CSS class to wrap around values < 0.
 * @property {string} [neutral] - CSS class to wrap around zero values.
 */
