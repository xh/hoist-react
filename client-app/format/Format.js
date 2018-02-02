/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/exception/Exception';
import {defaults, isFinite, isString, capitalize} from 'lodash';
import moment from 'moment';
import numeral from 'numeral';

const _THOUSAND = 1000,
    _MILLION  = 1000000,
    _BILLION  = 1000000000,
    _MAX_NUMERIC_PRECISION = 12;

const DATE_FMT = 'YYYY-MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    TIME_FMT = 'h:mma',
    MONTH_DAY_FMT = 'MMM D';

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

    if (typeof label === 'string') {
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
    v = v / _THOUSAND;
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

    v = v / _MILLION;
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

    v = v / _BILLION;
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

    const lessThanM = Math.abs(v) < _MILLION;

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

// intended for use with our percent format strings in XH.util.Export (which expects v / 100)
export function fmtExportPercent(v, {precision = 4} = {}) {
    if (!isFinite(v)) return '';
    return fmtNumber((v / 100), {precision: precision, zeroPad: true});
}

/**
 * Wrap values in a custom span
 *
 * @param v - value to be place in span
 * opts - may include:
 *   @param cls - string for span class
 *   @param title - string for span title
 *   @param leadSpc - set to true to add a space before the v to be wrapped
 *   @param trailSpc - set to true to add a space after the span to be returned
 *
 */
export function fmtSpan(v, {
    cls = null,
    title = null,
    leadSpc = false,
    trailSpc = false
} = {}) {

    if (v == null) return '';

    const txt = (leadSpc ? ' ' : '') + v;

    let ret = '<span';
    ret += cls ? ` class="${cls}"` : '';
    ret += title ? ` title="${title}"` : '';
    ret += `>${txt}</span>`;

    return trailSpc ? ret + ' ' : ret;
}

/**
 * Render dates and times with specified format
 *
 * @param v - date to format
 *
 * @param opts - Options object that may include
 *   @param fmt - MomentJs format string
 *   @param tipFn - function, use to place formatted date in span with title property set to returned string
 *                            will be passed the originalValue param
 *
 *  For convenience opts may be provided as a MomentJs format string.
 */
export function fmtDate(v, opts = {}) {
    if (typeof v === 'string') return v;
    if (typeof opts === 'string') opts = {fmt: opts};
    defaults(opts, {fmt: DATE_FMT, tipFn: null});
    saveOriginal(v, opts);

    let ret = moment(v).format(opts.fmt);

    if (opts.tipFn) {
        ret = fmtSpan(ret, {cls: 'xh-title-tip', title: opts.tipFn(opts.originalValue)});
    }

    return ret;
}

export function fmtDateTime(v, opts = {}) {
    if (typeof opts === 'string') opts = {fmt: opts};
    defaults(opts, {fmt: DATETIME_FMT});
    saveOriginal(v, opts);


    return fmtDate(v, opts);
}


export function fmtTime(v, opts = {}) {
    if (typeof opts === 'string') opts = {fmt: opts};
    defaults(opts, {fmt: TIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

/**
 * Render dates formatted based on distance in time from current day
 *
 * @param v - date to format
 * @param opts - MomentJs format string options, may include:
 *      @param sameDayFmt - format for dates matching current day, defaults to 'hh:mma'
 *      @param nearFmt - format for dates within the number of months determined by the recentTheshold, defaults to 'MMM D'
 *      @param distantFmt - format for dates outside of the number of months specified by the recentTheshold, defaults to 'YYYY-MM-DD'
 *      @param distantThreshold - int used to determined the number of months away from the current month to be considered 'recent'
 *      @param tipFn - function, use to place formatted date in span with title property set to string returned by this function
 *      @param originalValue - used to retain an unaltered reference to the original value to be formatted
 *                             Not typically used by applications.
 *
 * Note: Moments are mutable. Calling any of the manipulation methods will change the original moment.
 */
export function fmtCompactDate(v, {
    sameDayFmt = TIME_FMT,
    nearFmt = MONTH_DAY_FMT,
    distantFmt = DATE_FMT,
    distantThreshold = 6,
    tipFn = null,
    originalValue = v
} = {}) {

    const now = moment(),
        today = fmtDate(Date.now()), // probably in millis. v is probably a Date obj. maybe use new Date(), check.
        valueDay = fmtDate(v),
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        nearFuture = now.clone().add(distantThreshold, 'months').date(1),
        dateOpts = {tipFn: tipFn, originalValue: originalValue};

    if (today === valueDay) {
        dateOpts.fmt = sameDayFmt;
    } else if (moment(v).isBetween(recentPast, nearFuture)) {
        dateOpts.fmt = nearFmt;
    } else {
        dateOpts.fmt = distantFmt;
    }

    return fmtDate(v, dateOpts);
}


//-------------
// Renderers
//-------------
export const numberRenderer = createRenderer(fmtNumber);
export const thousandsRenderer = createRenderer(fmtThousands);
export const millionsRenderer = createRenderer(fmtMillions);
export const billionsRenderer = createRenderer(fmtBillions);
export const quantityRenderer = createRenderer(fmtQuantity);
export const priceRenderer = createRenderer(fmtPrice);
export const percentRenderer = createRenderer(fmtPercent);
export const exportPercentRenderer = createRenderer(fmtExportPercent);
export const dateRenderer = createRenderer(fmtDate);
export const dateTimeRenderer = createRenderer(fmtDateTime);
export const timeRenderer = createRenderer(fmtTime);
export const compactDateRenderer = createRenderer(fmtCompactDate);

/**
 * Basic util for splitting a string (via ' ') and capitalizing each word - e.g. for names.
 * Not intended to handle more advanced usages such as HTML or other word boundary characters.
 * @param str
 */
export function capitalizeWords(str) {
    if (str == null || !str.length) return str;
    return str.split(' ')
        .map(s => capitalize(s))
        .join(' ');
}

//---------------
// Implementation
//---------------

/**
 * Generate a renderer.
 * Renderers return a given formatter function.
 *
 * Renderers take a config for its formatter method
 * If this config is an object it will be cloned before being passed to its formatter.
 * Cloning ensures that the formatter gets a clean config object each time it is called.
 *
 * @param formatter - an existing method
 */
function createRenderer(formatter) {
    return function(config) {
        const isObj = (typeof config === 'object');
        return (v) => {
            const formatterConfig = isObj ? defaults({}, config) : config,
                val = (typeof v === 'object') ? v.value : v;
            return formatter(val, formatterConfig);
        };
    };
}

function saveOriginal(v, opts) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
}

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

// numeralJS: '0.00[0]' - this is the kill trailing zero pattern 1234567.890 => 1,234,567.89"
// number-formatter: numberFormatter( "#,##0.####", 1234567.890 );  // output: "1,234,567.89" // using this for now

// from number-formatter docs:
// When there's only one symbol is supplied, system will always treat the single symbol as Decimal.
// For instance, numberFormatter( '#,###', 1234567.890) will output 1234567,890.
// To force a single symbol as Separator, add a trailing dot to the end like this:
// numberFormatter( '#,###.', 1234567.890) which will then output 1,234,567.

function buildFormatPattern(v, precision, zeroPad) {
    const num = Math.abs(v);

    let pattern = '';

    if (precision % 1 === 0) {
        precision = precision < _MAX_NUMERIC_PRECISION ? precision : _MAX_NUMERIC_PRECISION;
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