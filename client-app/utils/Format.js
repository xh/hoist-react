/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */

import {Exception} from 'hoist/exception/Exception';
import {defaults, isFinite, isString, capitalize} from 'lodash';
import moment from 'moment';
import numeral from 'numeral';
import numberFormatter from 'number-formatter';

export const _THOUSAND = 1000,
    _MILLION  = 1000000,
    _BILLION  = 1000000000,
    _MAX_NUMERIC_PRECISION = 12;

export const DATE_FMT = 'YYYY-MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    TIME_FMT = 'h:mma',
    MONTH_DAY_FMT = 'MMM D';

export const DBL_SPC = '&nbsp;&nbsp;',
    BULLET = '&nbsp;&bull;&nbsp;',
    DELTA = '&#916;',
    UP_TICK = '&#9652;',
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

export function number(v, {
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

    if (v == null || v === '') return nullDisplay;

    formatPattern = formatPattern || buildFormatPattern(v, precision, zeroPad);

    let ret = numberFormatter(formatPattern, v);

    if (ledger || withSignGlyph) ret = ret.replace('-', '');

    if (withPlusSign && v > 0) {
        ret = '+' + ret;
    }

    if (typeof label === 'string') {
        if (labelCls) {
            ret += span(label, {cls: labelCls});
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
        ret = span(ret, {cls: valueColor(v, colorSpec)});
    }

    if (tipFn) {
        ret = span(ret, {cls: 'xh-title-tip', title: tipFn(originalValue)});
    }

    return ret;
}

/**
 * Render number in thousands.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function thousands(v, opts = {})  {
    saveOriginal(v, opts);

    if (v == null || v === '') return number(v, opts); // should probably add this check in hoist-sencha, see below
    v = v / _THOUSAND; // empty string input would return 0.00 even in our existing sencha implementations because '' / 1000 == 0
    if (opts.label === true) opts.label = 'k';
    return number(v, opts);
}

/**
 * Render number in millions.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function millions(v, opts = {})  {
    saveOriginal(v, opts);

    if (v == null || v === '') return number(v, opts);
    v = v / _MILLION;
    if (opts.label === true) opts.label = 'm';
    return number(v, opts);
}


/**
 * Render number in billions.
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function billions(v, opts = {})  {
    saveOriginal(v, opts);

    if (v == null || v === '') return number(v, opts);
    v = v / _BILLION;
    if (opts.label === true) opts.label = 'b';
    return number(v, opts);
}

/**
 * Render a quantity value, handling highly variable amounts by using 2dp millions for values > 1m
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function quantity(v, opts = {}) {
    saveOriginal(v, opts);

    if (v == null) return number(v, opts);

    const lessThanM = Math.abs(v) < _MILLION;

    defaults(opts, {
        ledger: true,
        label: true,
        precision: lessThanM ? 0 : 2
    });

    return lessThanM ? number(v, opts) : millions(v, opts);
}

/**
 * Render market price
 *
 * @param v - int or float to format
 * @param opts - see number() method
 */
export function price(v, opts = {}) {
    saveOriginal(v, opts);

    if (v == null || v === '') return number(v, opts);

    if (opts.precision === undefined) {
        const absVal = Math.abs(v);
        opts.precision = absVal < 1000 && absVal !== 0 ? 2 : 0;
    }

    return number(v, opts);
}

/**
 * Render a number as a percent
 *
 * @param v - int or float to format,
 * @param opts - see number() method - may also include:
 *          withParens, surround return with parenthesis
 */
export function percent(v, opts = {}) {
    saveOriginal(v, opts);

    if (v == null || v === '') return number(v, opts); // empty string in hoist-sencha => '%' or '(%)'

    defaults(opts, {precision: 2, label: '%', labelCls: null});

    let ret = number(v, opts);
    if (opts.withParens) ret = '(' + ret + ')';
    return ret;
}

// intended for use with our percent format strings in XH.util.Export (which expects v / 100)
export function exportPercent(v, {precision = 4} = {}) {
    if (v == null || isNaN(v)) return '';
    return number((v / 100), {precision: precision, zeroPad: true});
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
export function span(v, {
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
 *                (new to react-hoist: accepts Dates, date strings, or millis, as well as other supported inputs,
 *                see momentJS docs for details)
 *
 * @param opts - Options object that may include
 *   @param fmt - MomentJs format string
 *   @param tipFn - function, use to place formatted date in span with title property set to returned string
 *                            will be passed the originalValue param
 *
 *  For convenience opts may be provided as a an MomentJs format string.
 */
export function date(v, opts = {}) {
    if (typeof opts === 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATE_FMT, tipFn: null});

    let ret = moment(v).format(opts.fmt); // invalid input will produce a 'Invalid Date' string. Do we want to short circuit this with an empty string?

    if (opts.tipFn) {
        ret = span(ret, {cls: 'xh-title-tip', title: opts.tipFn(opts.originalValue)});
    }

    return ret;
}

export function dateTime(v, opts = {}) {
    if (typeof opts === 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATETIME_FMT});

    return date(v, opts);
}


export function time(v, opts = {}) {
    if (typeof opts === 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: TIME_FMT});

    return date(v, opts);
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
 */
export function compactDate(v, {
    sameDayFmt = TIME_FMT,
    nearFmt = MONTH_DAY_FMT,
    distantFmt = DATE_FMT,
    distantThreshold = 6,
    tipFn = null,
    originalValue = v
} = {}) {

    // Note from moment docs:
    // moments are mutable. Calling any of the manipulation methods will change the original moment.
    const now = moment(),
        today = date(now),
        valueDay = date(v),
        // // DEPRECATED: recentPast = ED.add(ED.getLastDateOfMonth(ED.add(now, ED.MONTH, -distantThreshold)), ED.DAY, 1),
        // now returns last of the month following the threshold, one day earlier from old arg
        // because moment's isBetween is exclusive without somewhat onerous extra args
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        // // DEPRECATED: nearFuture = ED.getFirstDateOfMonth(ED.add(now, ED.MONTH, distantThreshold)),
        // same as old, think this is good, we should excluded the first of this month
        // ie why format the first day of this month differently from the rest
        nearFuture = now.clone().add(distantThreshold, 'months').date(1),
        dateOpts = {tipFn: tipFn, originalValue: originalValue};

    if (today === valueDay) {
        dateOpts.fmt = sameDayFmt;
    } else if (moment(v).isBetween(recentPast, nearFuture)) {
        dateOpts.fmt = nearFmt;
    } else {
        dateOpts.fmt = distantFmt;
    }

    return date(v, dateOpts);
}


//-------------
// Renderers
//-------------
export const numberRenderer = createRenderer(number);
export const thousandsRenderer = createRenderer(thousands);
export const millionsRenderer = createRenderer(millions);
export const billionsRenderer = createRenderer(billions);
export const quantityRenderer = createRenderer(quantity);
export const priceRenderer = createRenderer(price);
export const percentRenderer = createRenderer(percent);
export const exportPercentRenderer = createRenderer(exportPercent);
export const dateRenderer = createRenderer(date);
export const dateTimeRenderer = createRenderer(dateTime);
export const timeRenderer = createRenderer(time);
export const compactDateRenderer = createRenderer(compactDate);


/**
 * DOMParser is the browser's parser.
 * It decodes HTML entities into their unicode equivalent without regex and is safe against XSS.
 * See: http://stackoverflow.com/questions/1912501/unescape-html-entities-in-javascript/34064434#34064434
 */
export function htmlDecode(v) {
    if (!isString(v) || v == null || !v.length) return v;
    const domParser = new DOMParser();
    return domParser.parseFromString(v, 'text/html').documentElement.textContent;
}

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
 * To account for ag-grid behavior, renderers will check it's input for a value property before passing to formatter
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
    return v === 0 ? span(UP_TICK, 'transparent-color') :  v > 0 ? UP_TICK : DOWN_TICK;
}

function valueColor(v, colorSpec) {
    if (!isFinite(v)) return '';

    const defaultColors = {pos: 'green', neg: 'red', neutral: 'gray'};
    colorSpec = typeof colorSpec === 'object' ? colorSpec : defaultColors;

    if (!colorSpec.pos || !colorSpec.neg || !colorSpec.neutral) {
        throw Exception('Invalid color spec: ' + colorSpec);
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
        pattern = precision === 0 ? '#,##0.' : '#,##0.' + '0'.repeat(precision);
    } else {
        if (num === 0) {
            pattern = '0.00';
        } else if (num < .01) {
            pattern = '#,##0.000000';
        } else if (num < 100) {
            pattern = '#,##0.0000';
        } else if (num < 10000) {
            pattern = '#,##0.00';
        } else {
            pattern = '#,##0.';
        }
    }

    if (!zeroPad) {
        const arr = pattern.split('.');
        if (arr[1]) arr[1] = arr[1].replace(/0/g, '#');
        pattern = arr.join('.');
    }

    return pattern;
}