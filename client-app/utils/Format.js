import {Exception} from 'hoist/exception/Exception';
import {defaults} from 'lodash';
import moment from 'moment';
import numeral from 'numeral';
import numberFormatter from 'number-formatter';
import {isNumber} from './JsUtils';

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

function number(v, {
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

    if (v == null) return nullDisplay;

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

// export const number = function(v, opts = {}) {
//
//     // both worked as expected
//     // return numberFormatter('#,##0.000#', 1234567.890000); // 1,234,567.890
//     return numeral(1234567.890000).format('0,0.000[0]'); // 1,234,567.890
// };

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
 *   @param fmt - Ext.Date format string
 *   @param tipFn - function, use to place formatted date in span with title property set to returned string
 *                            will be passed the originalValue param
 *
 *  For convenience opts may be provided as a an Ext.Date format string.
 */
export function date(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATE_FMT, tipFn: null});

    let ret = moment(v).format(opts.fmt); // invalid input will produce a 'Invalid Date' string. Do we want to short circuit this with an empty string?

    if (opts.tipFn) {
        ret = span(ret, {cls: 'xh-title-tip', title: opts.tipFn(opts.originalValue)});
    }

    return ret;
}

export function dateTime(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATETIME_FMT});

    return date(v, opts);
}


export function time(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: TIME_FMT});

    return date(v, opts);
}

/**
 * Render dates formatted based on distance in time from current day
 *
 * @param v - date to format
 * @param opts - Ext.Date format string options, may include:
 *      @param sameDayFmt - format for dates matching current day, defaults to 'g:ia'
 *      @param nearFmt - format for dates within the number of months determined by the recentTheshold, defaults to 'M d'
 *      @param distantFmt - format for dates outside of the number of months specified by the recentTheshold, defaults to 'Y-m-d'
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

    if (today == valueDay) {
        dateOpts.fmt = sameDayFmt;
    } else if (moment(v).isBetween(recentPast, nearFuture)) {
        dateOpts.fmt = nearFmt;
    } else {
        dateOpts.fmt = distantFmt;
    }

    return date(v, dateOpts);
}

export const numberRenderer = createRenderer(number);
export const dateRenderer = createRenderer(date);
export const dateTimeRenderer = createRenderer(dateTime);
export const timeRenderer = createRenderer(time);
export const compactDateRenderer = createRenderer(compactDate);

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
        const isObj = (typeof config == 'object');
        return (v) => {
            const formatterConfig = isObj ? defaults({}, config) : config,
                val = v.value || v;
            return formatter(val, formatterConfig);
        };
    };
}

function saveOriginal(v, opts) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
}

//---------------
// Implementation
//---------------

function signGlyph(v) {
    if (isNumber(v)) return '';
    return v === 0 ? span(UP_TICK, 'transparent-color') :  v > 0 ? UP_TICK : DOWN_TICK;
}

function valueColor(v, colorSpec) {
    if (!isNumber(v)) return '';

    const defaultColors = {pos: 'green', neg: 'red', neutral: 'gray'};
    colorSpec = typeof colorSpec == 'object' ? colorSpec : defaultColors;

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

    if (precision % 1 == 0) {
        precision = precision < _MAX_NUMERIC_PRECISION ? precision : _MAX_NUMERIC_PRECISION;
        pattern = precision == 0 ? '#,##0.' : '#,##0.' + '0'.repeat(precision);
    } else {
        if (num == 0) {
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

// /////////////////////////////////
// TESTS
// ///////////////////////////////

// run tests in hoist-sencha too. Some might fail now due to legit changes, not just lost in translation

export function numberTests() {

    console.log('');
    console.log('NUMBERS');
    console.log('');

    test('number {precision: 2})', number(100.00000, {precision: 2}) == '100.00');
    test('number {precision: 2, zeroPad: false})', number(100.00000, {
        precision: 2,
        zeroPad: false
    }) == '100');
    test('number(long decimal) {precision: 2}', number(100.012345678910111213, {
        precision: 2
    }) == '100.01');
    test('number(over max precision) {precision: 15}', number(100.012345678910111213, {
        precision: 15
    }) == '100.012345678910');
    test('number(over max precision) {precision: 15}!!!', number(100.012345678910111213, {
        precision: 15
    }) == '100.012345678910');
    test('number(auto)', number(100.012345678910111213) == '100.01');
    test('number(commas for 1000000)', number(1000000) == '1,000,000');
    test('number(commas for 1000000000)', number(1000000000) == '1,000,000,000');
    test('numberRenderer {precision: 4, zeroPad: true}', numberRenderer({
        precision: 4
    })(100.012345678910111213) == '100.0123');

    // need tests for formatter patterns and hueristic


    //
    // test('thousands', thousands(1550, {label: true}) == '1.55<span class=\"units-label\">k</span>');
    // test('thousands (zero)', thousands(0, {label: true}) == '0<span class=\"units-label\">k</span>');
    // test('thousands (no label)', thousands(1550) == '1.55');
    // test('thousands (no label larger value, zeroPad)', thousands(1234567, {zeroPad: true}) == '1,234.57');
    // test('thousands(pos) {colorSpec: true}', thousands(1000, {
    //         label: false,
    //         colorSpec: true
    //     }) == '<span class=\"green\">1</span>');
    // test('thousands(neg) label color and ledger)', thousands(-1000, {
    //         colorSpec: true,
    //         ledger: true
    //     }) == '<span class=\"red\">(1)</span>');
    // test('thousands(zero) (colorSpec: true)', thousands(0, {
    //         label: false,
    //         colorSpec: true
    //     }) == '<span class=\"ium-gray\">0</span>');
    //
    // test('millions', millions(1000000, {label: true}) == '1<span class=\"units-label\">m</span>');
    // test('millions', millions(1000000, {label: 'M'}) == '1<span class=\"units-label\">M</span>');
    // test('millions (zero)', millions(0, {label: true}) == '0<span class=\"units-label\">m</span>');
    // test('millions no label)', millions(1555555) == '1.56');
    // test('millions (precision: 4)', millions(1555555, {
    //         precision: 4
    //     }) == '1.5556');
    // test('millions (huge number)', millions(1555555778877) == '1,555,555.78');
    // test('millions(pos) (colorSpec: true)', millions(1555555, {
    //         colorSpec: true
    //     }) == '<span class=\"green\">1.56</span>');
    // test('millions(neg) (colorSpec: true)', millions(-1555555, {
    //         colorSpec: true
    //     }) == '<span class=\"red\">-1.56</span>');
    // test('millions(neg) (colorSpec: true, ledger: true)', millions(-1555555, {
    //         colorSpec: true,
    //         ledger: true
    //     }) == '<span class=\"red\">(1.56)</span>');
    // test('millions(zero) (colorSpec: true)', millions(0, {
    //         colorSpec: true
    //     }) == '<span class=\"ium-gray\">0</span>');
    //
    // test('billions with default label', billions(1000000000, {label: true}) == '1<span class=\"units-label\">b</span>');
    // test('billions with custom label', billions(1000000000, {label: 'B'}) == '1<span class=\"units-label\">B</span>');
    // test('billions (zero, label)', billions(0, {label: true}) == '0<span class=\"units-label\">b</span>');
    // test('billions (with no label)', billions(1555555000) == '1.56');
    // test('billions (precision: 4)', billions(1555555000, {
    //         precision: 4
    //     }) == '1.5556');
    // test('billions (huge number)', billions(1555555778877999) == '1,555,555.78');
    // test('billions(pos) (colorSpec: true)', billions(1555555000, {
    //         colorSpec: true
    //     }) == '<span class=\"green\">1.56</span>');
    // test('billions(neg) (colorSpec: true, ledger: true)', billions(-1555555000, {
    //         ledger: true,
    //         colorSpec: true
    //     }) == '<span class=\"red\">(1.56)</span>');
    // test('billions(zero) (colorSpec: true)', billions(0, {
    //         colorSpec: true
    //     }) == '<span class=\"ium-gray\">0</span>');
    //
    // test('percent default label', percent(50, {label: true}) == '50%');
    // test('percent (zero)', percent(0) == '0');
    // test('percent}', percent(51.1) == '51.1');
    // test('percent(pos, with label and color)', percent(51.1, {
    //         label: true,
    //         colorSpec: true
    //     }) == '<span class=\"green\">51.1%</span>');
    // test('percent(neg) {colorSpec: true, label: true}', percent(-51.1, {
    //         label: true,
    //         colorSpec: true
    //     }) == '<span class=\"red\">-51.1%</span>');
    // test('percent(zero) {colorSpec: true}', percent(0, {
    //         colorSpec: true
    //     }) == '<span class=\"ium-gray\">0</span>');
    //
    // let expectedPercentChange = '0.00%';
    // test('percentChange (zero label)', percentChange(0, {label: true}) == expectedPercentChange);
    //
    // expectedPercentChange = '<span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe613;</span>51.00%';
    // test('percentChange (51 label)', percentChange(51, {label: true}) == expectedPercentChange);
    //
    // expectedPercentChange = '<span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe612;</span>51.00%';
    // test('percentChange (-51 label)', percentChange(-51, {label: true}) == expectedPercentChange);
    //
    // expectedPercentChange = '<span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe613;</span>51.11';
    // test('percentChange (51.11, no label)', percentChange(51.11, {}) == expectedPercentChange);
    // test('percentChange (51.11, colorSpec: true} no label)', percentChange(51.11, {
    //         colorSpec: true
    //     }) == '<span class=\"green\">' + expectedPercentChange + '</span>');
    //
    // let expectedEquity = '0<span class=\"units-label\">m</span>';
    // test('equity (zero w/label)', equity(0, {label: true}) == expectedEquity);
    //
    // expectedEquity = '9.88<span class=\"units-label\">m</span>';
    // test('equity (under 10mil w/label)', equity(9876540, {label: true}) == expectedEquity);
    //
    // expectedEquity = '10.9<span class=\"units-label\">m</span>';
    // test('equity: (under 100mil w/label)', equity(10876540, {label: true}) == expectedEquity);
    //
    // expectedEquity = '1,235<span class=\"units-label\">m</span>';
    // test('equity: (over 100mil w/label)', equity(1234567890, {label: true}) == expectedEquity);
    //
    // expectedEquity = '0<span class=\"units-label\">m</span>';
    // test('equity (zero w/label)', equity(0, {label: true}) == expectedEquity);
    //
    // let expectedBasisPoints = '10,111,111,111<span class=\"units-label\">bp</span>';
    // test('basisPoints', basisPoints(10111111111.111111) == expectedBasisPoints);
    // test('basisPoints (zero)', basisPoints(0) == '0<span class=\"units-label\">bp</span>');
    //
    // expectedBasisPoints = '10,111,111,112<span class=\"units-label\">bp</span>';
    // test('basisPoints (decimal)', basisPoints(10111111111.9) == expectedBasisPoints);
    //
    // expectedBasisPoints = '10.11<span class=\"units-label\">bp</span>';
    // test('basisPoints ({precision: 2})', basisPoints(10.11, {precision: 2}) == expectedBasisPoints);
    // test('basisPoints ({precision: 4, label: false})', basisPoints(10.11, {
    //         precision: 4,
    //         label: false
    //     }) == '10.1100');

    test('number as ledger (zero) {precision: 0}', number(0, {ledger: true, precision: 0}) == '0<span style="visibility:hidden">)</span>');
    test('number as ledger (zero) {ledgerAlign: false, precision: 0}', number(0, {ledger: true, forceLedgerAlign: false, precision: 0}) == '0', number(0, {ledger: true, ledgerAlign: false, precision: 0}));
    test('number as ledger (pos) {ledgerAlign: false}', number(123456789, {ledger: true, forceLedgerAlign: false}) == '123,456,789');
    test('number as ledger (neg) {ledgerAlign: false}', number(-987654321, {ledger: true, forceLedgerAlign: false}) == '(987,654,321)');
    test('number as ledger (with label, no label class) {ledgerAlign: false}', number(99500, {
        ledger: true,
        forceLedgerAlign: false,
        label: '$',
        labelCls: null
    }) == '99,500$');
    test('number as ledger (pos)(colorSpec)', number(120000, {
        ledger: true,
        forceLedgerAlign: false,
        colorSpec: true
    }) == '<span class=\"green\">120,000</span>');
    test('number as ledger (neg)(colorSpec)', number(-90, {
        ledger: true,
        forceLedgerAlign: false,
        colorSpec: true
    }) == '<span class=\"red\">(90.0000)</span>');

    // test('quantity < billion, with unitlabel', quantity(123456789, {
    //         unitsLabel: '@'
    //     }) == '123.46<span class=\"units-label\">m</span><span class=\"units-label\"> @</span>');
    //
    // test('quantity > billion, allowBillions: false', quantity(12345678910, {
    //         allowBillions: false
    //     }) == '12,345.68<span class=\"units-label\">m</span>');
    //
    // test('quantity > billion, allowBillions: true', quantity(12345678910, {
    //         allowBillions: true
    //     }) == '12.35<span class=\"units-label\">b</span>');
    //
    // test('quantity, float, > billion, allowBillions: true', quantity(12345678910.1, {
    //         allowBillions: true
    //     }) == '12.35<span class=\"units-label\">b</span>');
    //
    // test('quantity, neg, > billion, allowBillions: true', quantity(-12345678910.1, {
    //         allowBillions: true
    //     }) == '-12.35<span class=\"units-label\">b</span>');
    //
    // test('quantity, neg with ledger, > billion, allowBillions: true', quantity(-12345678910.1, {
    //         allowBillions: true,
    //         ledger: true
    //     }) == '(12.35<span class=\"units-label\">b</span>)');
    //
    // test('quantity, small float', quantity(-2.15678) == '-2.1568');

    // test('losslessQuantity, allowed rounding', losslessQuantity(10000000) == '10<span class=\"units-label\">m</span>');
    // test('losslessQuantity, allowed rounding', losslessQuantity(12340000) == '12.34<span class=\"units-label\">m</span>');
    // test('losslessQuantity, no rounding', losslessQuantity(123456789) == '123,456,789');
    //
    // test('quantityChange pos', quantityChange(123456789) == '+123.46<span class="units-label">m</span>');
    // test('quantityChange neg', quantityChange(-123456789) == '-123.46<span class="units-label">m</span>');
    // test('quantityChange pos allow billions', quantityChange(12345678910, {allowBillions: true}) == '+12.35<span class="units-label">b</span>');
    // test('quantityChange neg allow billions', quantityChange(-12345678910, {allowBillions: true}) == '-12.35<span class="units-label">b</span>');
    // test('quantityChange zero', quantityChange(0, {allowBillions: true}) == '-');
    //
    // test('price: (zero)', price(0) == '0.0000');
    // test('price: (1)', price(1) == '1.0000');
    // test('price: (10)', price(10) == '10.00');
    // test('price: (1000)', price(1000) == '1,000');
    //
    // let expPrcChange = '0.0000';
    // test('priceChange (zero)', priceChange(0) == expPrcChange);
    //
    // expPrcChange = '<span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe613;</span>1.1235';
    // test('priceChange (pos)', priceChange(1.12345) == expPrcChange);
    //
    // expPrcChange = '<span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe612;</span>5.6543';
    // test('priceChange (neg)', priceChange(-5.654321) == expPrcChange);
    //
    // expPrcChange = '<span class=\"ium-gray\">0.0000</span>';
    // test('priceChange (zero) {colorSpec: true}', priceChange(0, {colorSpec: true}) == expPrcChange);
    //
    // expPrcChange = '<span class=\"green\"><span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe613;</span>112,345</span>';
    // test('priceChange (pos) {colorSpec: true}', priceChange(112345, {colorSpec: true}) == expPrcChange);
    //
    // expPrcChange = '<span class=\"red\"><span style=\"font-size:1.1em\" class=\" tud-glyph\">&#xe612;</span>321.99</span>';
    // test('priceChange (neg) {colorSpec: true}', priceChange(-321.9875, {colorSpec: true}) == expPrcChange);

};

function badInputNumberTests() {
    console.log('');
    console.log('Numbers (Out of Bounds)');
    console.log('');

    const empty = '';

    test('number (null)', number(null) == empty);
    test('number (undefined)', number(undefined) == empty);
    test('number (\'\')', number('') == empty);
    // test('thousands (null)', thousands(null) == empty);
    // test('thousands (undefined)', thousands(undefined) == empty);
    // test('thousands (\'\')', thousands('') == empty);
    // test('millions (null)', millions(null) == empty);
    // test('millions (undefined)', millions(undefined) == empty);
    // test('millions (\'\')', millions('') == empty);
    // test('billions (null)', billions(null) == empty);
    // test('billions (undefined)', billions(undefined) == empty);
    // test('billions (\'\')', billions('') == empty);
    // test('percent (null)', percent(null) == empty);
    // test('percent (undefined)', percent(undefined) == empty);
    // test('percent (\'\')', percent('') == empty);
    // test('percentChange (null)', percentChange(null) == empty);
    // test('percent (undefined)', percent(undefined) == empty);
    // test('percent (\'\')', percent('') == empty);
    // test('equity (null)', equity(null) == '');
    // test('equity (undefined)', equity(undefined) == '');
    // test('equity (\'\')', equity('') == '');
    // test('basisPoints (null)', equity(null) == '');
    // test('basisPoints (undefined)', equity(undefined) == '');
    // test('basisPoints (\'\')', equity('') == '');

    // test('quantity(null)', quantity(null) == '');
    // test('quantity(undefined)', quantity(undefined) == '');
    // test('quantity(\'\')', quantity('') == '');
    // test('quantityChange (null)', quantityChange(null) == '');
    // test('quantityChange (undefined)', quantityChange(undefined) == '');
    // test('quantityChange (\'\')', quantityChange('') == '');
    // test('losslessQuantity(null)', losslessQuantity(null) == '');
    // test('losslessQuantity(undefined)', losslessQuantity(undefined) == '');
    // test('losslessQuantity (\'\')', losslessQuantity('') == '');
    //
    // test('price (null)', price(null) == empty);
    // test('price (undefined)', price(undefined) == empty);
    // test('price (\'\')', price('') == empty);
    // test('priceChange (null)', priceChange(null) == empty);
    // test('priceChange (undefined)', priceChange(undefined) == empty);
    // test('priceChange (\'\')', priceChange('') == empty);
}


function test(testTitle, testCondition, output) {
    if (output) console.log(output);
    console.log(testCondition ? 'passed: ' : '!!!!FAILED!!!!: ', testTitle);
}