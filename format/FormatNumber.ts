/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';
import {
    clamp,
    defaults,
    isBoolean,
    isFinite,
    isFunction,
    isInteger,
    isNil,
    isNumber,
    isString,
    isUndefined,
    round
} from 'lodash';
import {CSSProperties, ReactNode} from 'react';
import {IntRange} from 'type-fest';
import {fmtSpan, FormatOptions} from './FormatMisc';
import {createRenderer} from './FormatUtils';
import {saveOriginal} from './impl/Utils';

const THOUSAND = 1000,
    MILLION = 1000000,
    BILLION = 1000000000,
    MAX_NUMERIC_PRECISION = 12,
    MAX_SIGNIFICANT_DIGITS = 15;

const UP_TICK = '▴',
    DOWN_TICK = '▾',
    LEDGER_ALIGN_PLACEHOLDER = '<span style="visibility:hidden">)</span>',
    LEDGER_ALIGN_PLACEHOLDER_EL = span({style: {visibility: 'hidden'}, item: ')'}),
    DEFAULT_COLOR_SPEC: ColorSpec = {
        pos: 'xh-pos-val',
        neg: 'xh-neg-val',
        neutral: 'xh-neutral-val'
    };

export type NumericPrecision = IntRange<0, 13>;
export type Precision = NumericPrecision | 'auto';
export type ZeroPad = NumericPrecision | boolean;

export interface NumberFormatOptions extends Omit<FormatOptions<number>, 'tooltip'> {
    /**
     * Color output based on the sign of the value. True to use red/green/grey defaults, or provide
     * an object with alternate CSS classes or properties.
     */
    colorSpec?: boolean | ColorSpec;

    /**
     * True to add placeholder after positive ledgers to ensure columns of mixed positive and
     * negative numbers vertically align their digits, avoiding shift due to ")" on negative values.
     */
    forceLedgerAlign?: boolean;

    /** Not supported - removed in v89 with numbro. Use `precision`, `zeroPad` and `withCommas`. */
    formatConfig?: never;

    /**
     * Label to append to value, or true to append a default label for the formatter -
     * e.g. 'm' for fmtMillions.
     */
    label?: string | boolean;

    /** CSS class of label span. */
    labelCls?: string;

    /** True to use ledger format. */
    ledger?: boolean;

    /**
     * Set to true to omit thousands-separator comma if value is to be formatted as a whole number
     * with exactly 4 digits (e.g. 1,500).
     */
    omitFourDigitComma?: boolean;

    /**
     * Desired number of decimal places, 'auto' (default) to adjust the displayed precision
     * automatically based on the scale of the value, or null for full, unrestricted precision
     * (capped at the max supported precision, with trailing zeros trimmed).
     */
    precision?: Precision;

    /** Prefix to prepend to value (between the number and its sign). */
    prefix?: string;

    /**
     * If set to false, small numbers that would show only digits of zero due to precision will be
     * formatted as exactly zero. In particular, if a zeroDisplay is specified it will be used and
     * sign-based glyphs, '+/-' characters, and colors will not be shown. Default true.
     */
    strictZero?: boolean;

    /**
     * True to enable default tooltip with minimally formatted original value, or a function to
     * generate a custom tooltip string.
     */
    tooltip?: boolean | ((v: number) => string);

    /** True to include comma delimiters. */
    withCommas?: boolean;

    /** True to prepend positive numbers with a '+'. */
    withPlusSign?: boolean;

    /** True to prepend an up / down arrow. */
    withSignGlyph?: boolean;

    /** Optional display value for the input value 0. */
    zeroDisplay?: ReactNode;

    /**
     * True to pad with trailing zeros out to precision, false to skip adding any trailing zeroes.
     * Can also be a number (lte precision) to specify a minimum number of trailing zeroes to add,
     * without extending zero padding all the way out to full precision.
     *
     * e.g. `{precision:4, zeroPad:2}` will format `1.2` → "1.20" and `1.234` → "1.234"
     *
     * Default is true if a fixed precision is set, false if precision is 'auto' or null (full).
     */
    zeroPad?: ZeroPad;
}

export interface QuantityFormatOptions extends NumberFormatOptions {
    /** True to compact values \>= 1 million into units of millions (m). Default true. */
    useMillions?: boolean;

    /** True to compact values \>= 1 billion into units of billions (b). Default true. */
    useBillions?: boolean;

    /**
     * True to compact to m/b units only when no precision is lost, else render the full value.
     * Default false.
     */
    lossless?: boolean;
}

/** Config for pos/neg/neutral color classes. */
export interface ColorSpec {
    /** CSS color class or CSS Style Properties to apply to positive values */
    pos?: string | CSSProperties;

    /** CSS color class or CSS Style Properties to apply to negative values */
    neg?: string | CSSProperties;

    /** CSS color class or CSS Style Properties to apply to  zero values. */
    neutral?: string | CSSProperties;
}

/**
 * Standard number formatting for Hoist
 *
 * Formats digits with the browser's `Intl.NumberFormat`, fixed to the `en-US` locale. Values round
 * half away from zero on their decimal digits: 2.5 gives 3, -2.5 gives -3, 1.005 at 2 places gives
 * 1.01, and `fmtPercent(0.0045, {precision: 1})` gives 0.5% although 0.0045 * 100 is
 * 0.44999999999999996 in floating point.
 *
 * If no options are given, a heuristic based auto-rounding will occur.
 *
 * @returns a ReactNode.  For an HTML string use `asHtml = true`.
 */
export function fmtNumber(v: number, opts?: NumberFormatOptions): ReactNode {
    let {
        nullDisplay = '',
        zeroDisplay = null,
        formatConfig = null,
        precision,
        zeroPad,
        ledger = false,
        forceLedgerAlign = true,
        withPlusSign = false,
        strictZero = true,
        withSignGlyph = false,
        withCommas = true,
        omitFourDigitComma = false,
        prefix = null,
        label = null,
        labelCls = 'xh-units-label',
        colorSpec = false,
        tooltip = null,
        asHtml = false,
        originalValue = v
    } = opts ?? ({} as NumberFormatOptions);
    throwIf(formatConfig, FORMAT_CONFIG_REMOVED);
    if (isInvalidInput(v)) return nullDisplay;

    // Resolve precision: null means full precision, other non-integers (e.g. undefined) mean 'auto'.
    const fullPrecision = precision === null;
    if (fullPrecision) {
        precision = calcFullPrecision(v);
    } else if (!isInteger(precision)) {
        precision = 'auto';
    }

    // Default zeroPad to pad only for a fixed precision - 'auto' and full precision trim zeros.
    if (isNil(zeroPad)) zeroPad = precision != 'auto' && !fullPrecision;

    const str = fmtDigits(v, precision, zeroPad, withCommas, omitFourDigitComma);
    let sign = null;

    // Tests for zero strings at various precisions
    if (!strictZero && /^0+.?0*$/.test(str)) {
        // Treat rounded zeros as a true zero, for sign checks
        v = 0;
    }

    if (v === 0 && zeroDisplay != null) {
        return zeroDisplay;
    }

    if (v > 0 && withPlusSign) {
        sign = '+';
    } else if (v < 0 && !ledger) {
        sign = '-';
    }

    // As an optimization, return the string form if we do not *need* to wrap in markup.
    const delOpts = {
            ledger,
            forceLedgerAlign,
            withSignGlyph,
            prefix,
            label,
            labelCls,
            colorSpec,
            tooltip,
            originalValue
        },
        asString =
            !withSignGlyph &&
            !colorSpec &&
            !tooltip &&
            (!ledger || !forceLedgerAlign) &&
            (!label || !labelCls);

    return asHtml || asString
        ? fmtNumberString(v, str, sign, delOpts)
        : fmtNumberElement(v, str, sign, delOpts);
}

/**
 * Render number in thousands.
 */
export function fmtThousands(v: number, opts?: NumberFormatOptions): ReactNode {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);
    v = v / THOUSAND;
    if (opts.label === true) opts.label = 'k';
    return fmtNumber(v, opts);
}

/**
 * Render number in millions.
 */
export function fmtMillions(v: number, opts?: NumberFormatOptions): ReactNode {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = v / MILLION;
    if (opts.label === true) opts.label = 'm';
    return fmtNumber(v, opts);
}

/**
 * Render number in billions.
 */
export function fmtBillions(v: number, opts?: NumberFormatOptions): ReactNode {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    v = v / BILLION;
    if (opts.label === true) opts.label = 'b';
    return fmtNumber(v, opts);
}

/**
 * Render a quantity value, handling highly variable amounts by using units of millions (m) and
 * billions (b) as needed.'
 */
export function fmtQuantity(v: number, opts?: QuantityFormatOptions) {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    defaults(opts, {
        ledger: true,
        label: true,
        useMillions: true,
        useBillions: true,
        lossless: false
    });

    const absV = Math.abs(v),
        lessM = absV < MILLION,
        lessB = absV < BILLION;

    // Compute scaling, if any (Lossless flag may preclude).
    let scale = !lessB && opts.useBillions ? BILLION : !lessM && opts.useMillions ? MILLION : null;
    if (scale && opts.lossless) {
        const precision = parsePrecision(absV / scale, opts.precision ?? 2),
            lossy = v % (scale / 10 ** precision) !== 0;
        if (lossy) scale = null;
    }

    // Resolve render precision (unless the caller set one) - 2 places if scaled, else 0.
    if (isUndefined(opts.precision)) {
        opts.precision = opts.lossless ? null : scale ? 2 : 0;
    }

    switch (scale) {
        case BILLION:
            return fmtBillions(v, opts);
        case MILLION:
            return fmtMillions(v, opts);
        default:
            return fmtNumber(v, opts);
    }
}

/**
 * Render market price.
 */
export function fmtPrice(v: number, opts?: NumberFormatOptions): ReactNode {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    if (opts.precision === undefined) {
        const absVal = Math.abs(v);
        opts.precision = absVal < 1000 && absVal !== 0 ? 2 : 0;
    }

    return fmtNumber(v, opts);
}

/**
 * Render a number as a percent. Value will be multiplied by 100 to calculated the percentage.
 * This behavior purposefully matches Microsoft Excel's percentage formatting.
 */
export function fmtPercent(v: number, opts?: NumberFormatOptions): ReactNode {
    opts = {...opts};
    saveOriginal(v, opts);
    if (isInvalidInput(v)) return fmtNumber(v, opts);

    defaults(opts, {precision: 2, label: '%', labelCls: null});
    return fmtNumber(v * 100, opts);
}

/**
 * Render a minimally formatted, full precision number, suitable for use in tooltips.
 * Only ledger opt is supported.
 *
 * @param v - value to format.
 * @param opts - set key 'ledger' to true to use ledger format, default false
 */
export function fmtNumberTooltip(v: number, opts?: {ledger?: boolean}): string {
    return fmtNumber(v, {
        ledger: opts?.ledger,
        forceLedgerAlign: false,
        precision: null,
        zeroPad: false,
        asHtml: true
    }) as string;
}

//---------------
// Implementation
//---------------
function fmtNumberElement(v: number, str: string, sign: '+' | '-', opts?: NumberFormatOptions) {
    const {ledger, forceLedgerAlign, withSignGlyph, prefix, label, labelCls, colorSpec, tooltip} =
        opts ?? {};

    // CSS classes
    const cls = [];
    if (colorSpec) cls.push(calcClassFromColorSpec(v, colorSpec));
    if (tooltip) cls.push('xh-title-tip');

    // Compile child items
    const items = [];
    if (withSignGlyph) {
        items.push(signGlyph(v));
    } else if (sign) {
        items.push(sign);
    }

    if (isString(prefix)) {
        items.push(prefix);
    }

    items.push(str);

    if (isString(label)) {
        items.push(labelCls ? fmtSpan(label, {className: labelCls}) : label);
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
        style: calcStyleFromColorSpec(v, colorSpec),
        title: processToolTip(tooltip, opts),
        items: items
    });
}

function fmtNumberString(
    v: number,
    str: string,
    sign: '+' | '-',
    opts?: NumberFormatOptions
): string {
    const {ledger, forceLedgerAlign, withSignGlyph, label, labelCls, colorSpec, tooltip, prefix} =
            opts,
        asHtml = true;
    let ret = '';

    if (withSignGlyph) {
        ret += signGlyph(v, asHtml);
    } else if (sign) {
        ret += sign;
    }

    if (isString(prefix) && prefix.trim()) {
        ret += prefix;
    }

    ret += str;

    if (isString(label) && label.trim()) {
        if (labelCls) {
            ret += fmtSpan(label, {className: labelCls, asHtml});
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
        ret = fmtSpan(ret, {
            className: calcClassFromColorSpec(v, colorSpec),
            style: calcStyleFromColorSpec(v, colorSpec),
            asHtml
        }) as string;
    }

    if (tooltip) {
        ret = fmtSpan(ret, {
            className: 'xh-title-tip',
            title: processToolTip(tooltip, opts),
            asHtml
        }) as string;
    }

    return ret;
}

function signGlyph(v: number, asHtml: boolean = false) {
    if (!isFinite(v)) return '';
    return v === 0
        ? fmtSpan(UP_TICK, {className: 'xh-transparent', asHtml})
        : v > 0
          ? UP_TICK
          : DOWN_TICK;
}

function calcClassFromColorSpec(v: number, colorSpec: ColorSpec | boolean): string {
    if (colorSpec === true) colorSpec = DEFAULT_COLOR_SPEC;
    if (!isFinite(v) || !colorSpec) return '';

    const possibleClassName = v < 0 ? colorSpec.neg : v > 0 ? colorSpec.pos : colorSpec.neutral;
    return isString(possibleClassName) ? possibleClassName : '';
}

function calcStyleFromColorSpec(v: number, colorSpec: ColorSpec | boolean): CSSProperties {
    if (!isFinite(v) || isBoolean(colorSpec) || !colorSpec) return {};

    const possibleStyles = v < 0 ? colorSpec.neg : v > 0 ? colorSpec.pos : colorSpec.neutral;
    return !isString(possibleStyles) ? possibleStyles : {};
}

/**
 * Resolve a precisionSpec to a concrete number of decimal places. A fixed precision is clamped to
 * 0-12, while 'auto' is derived from the scale of the value.
 */
function parsePrecision(v: number, precisionSpec: Precision): number {
    // Fixed precision - use requested, clamped to the supported range.
    if (precisionSpec !== 'auto') return clamp(precisionSpec, 0, MAX_NUMERIC_PRECISION);

    // 'auto' - derive from the scale of the value.
    const absVal = Math.abs(v);
    if (absVal === 0) return 2;
    if (absVal < 0.01) return 6;
    if (absVal < 100) return 4;
    if (absVal < 10000) return 2;
    return 0;
}

/**
 * Resolve full precision to the most decimal places a value can show, capped so its integer and
 * decimal digits fit within the significant digits a double holds exactly. More places would
 * render float noise - e.g. 44,510,347.00000001.
 */
function calcFullPrecision(v: number): NumericPrecision {
    const absVal = Math.abs(v),
        intDigits = absVal >= 1 ? Math.floor(Math.log10(absVal)) + 1 : 0;
    return clamp(MAX_SIGNIFICANT_DIGITS - intDigits, 0, MAX_NUMERIC_PRECISION) as NumericPrecision;
}

// Intl.NumberFormat instances by resolved (minFD, maxFD, useGrouping): at most 91 x 2.
const digitFormats = new Map<number, Intl.NumberFormat>();

const FORMAT_CONFIG_REMOVED =
    "Number format option 'formatConfig' was removed in Hoist v89. Use 'precision', 'zeroPad' " +
    "and 'withCommas' instead - e.g. {precision: 0, withCommas: false}.";

/**
 * Format the digits of a value: its magnitude, rounded to the resolved precision, with trailing
 * zeros padded or trimmed per zeroPad and thousands grouped per withCommas. The caller adds the
 * sign, prefix, label and ledger parentheses.
 */
function fmtDigits(
    v: number,
    precisionSpec: Precision,
    zeroPad: ZeroPad,
    withCommas: boolean,
    omitFourDigitComma: boolean
): string {
    let absVal = Math.abs(v);
    const maxFD = parsePrecision(v, precisionSpec),
        // A numeric zeroPad pads to that many places and shows any further places the value has,
        // up to the precision. Like Intl, this floors a fractional zeroPad, which keeps the cache
        // key unique.
        minFD = isNumber(zeroPad) ? clamp(Math.floor(zeroPad), 0, maxFD) : zeroPad ? maxFD : 0,
        // Group thousands unless omitFourDigitComma applies - a value under 10,000 shown whole.
        useGrouping =
            withCommas &&
            !(
                omitFourDigitComma &&
                absVal < 10000 &&
                (maxFD === 0 || (!zeroPad && Number.isInteger(absVal)))
            );

    // Round a value within float error of a tie here, with lodash `round` on its magnitude. It
    // shifts the decimal point before it rounds half up, which absorbs float error: 1.15 * 3
    // (3.4499999999999997) rounds to 3.5, as the arithmetic intended. A tolerance of
    // 2 * Number.EPSILON covers every value the shift can move onto a tie. Any other value rounds
    // the same under every Intl rounding mode. Past 15 significant digits the tolerance would
    // cover nearly every value, so Intl rounds those as they are.
    const shifted = absVal * 10 ** maxFD;
    if (
        shifted < 1e15 &&
        Math.abs(shifted - Math.floor(shifted) - 0.5) < shifted * 2 * Number.EPSILON
    ) {
        absVal = round(absVal, maxFD);
    }

    const key = minFD * 32 + maxFD * 2 + (useGrouping ? 1 : 0);
    let fmt = digitFormats.get(key);
    if (!fmt) {
        fmt = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: minFD,
            maximumFractionDigits: maxFD,
            useGrouping
        });
        digitFormats.set(key, fmt);
    }
    return fmt.format(absVal);
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

const shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))([kmb])\b/i;

/**
 * @param value - A value that represents a shorthand numerical value
 * @returns The number represented by the shorthand string, or NaN
 */
export function parseNumber(value: any): number {
    if (isNil(value) || value === '') return null;

    value = value.toString();
    value = value.replace(/,/g, '');

    if (shorthandValidator.test(value)) {
        const numStr = value.substring(0, value.length - 1),
            lastChar = value.charAt(value.length - 1).toLowerCase();

        // Shift by exponent rather than multiply, to avoid float artifacts (8.2 * 1e6 != 8.2e6).
        switch (lastChar) {
            case 'k':
                return +`${numStr}e3`;
            case 'm':
                return +`${numStr}e6`;
            case 'b':
                return +`${numStr}e9`;
            default:
                return NaN;
        }
    }

    return parseFloat(value);
}
