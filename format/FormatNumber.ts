/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {
    defaults,
    isBoolean,
    isFinite,
    isFunction,
    isInteger,
    isNil,
    isNumber,
    isString,
    round
} from 'lodash';
import Numbro from 'numbro';
import numbro from 'numbro';
import {CSSProperties, ReactNode} from 'react';
import {IntRange} from 'type-fest';
import {fmtSpan, FormatOptions} from './FormatMisc';
import {createRenderer} from './FormatUtils';
import {saveOriginal} from './impl/Utils';

const THOUSAND = 1000,
    MILLION = 1000000,
    BILLION = 1000000000,
    MAX_NUMERIC_PRECISION = 12;

const UP_TICK = '▴',
    DOWN_TICK = '▾',
    LEDGER_ALIGN_PLACEHOLDER = '<span style="visibility:hidden">)</span>',
    LEDGER_ALIGN_PLACEHOLDER_EL = span({style: {visibility: 'hidden'}, item: ')'}),
    DEFAULT_COLOR_SPEC: ColorSpec = {
        pos: 'xh-pos-val',
        neg: 'xh-neg-val',
        neutral: 'xh-neutral-val'
    };

export type Precision = 'auto' | IntRange<0, 13>;
export type ZeroPad = boolean | IntRange<1, 13>;

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

    /** A valid numbro format object or string. */
    formatConfig?: Numbro.Format | string;

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
     * Desired number of decimal places, or 'auto' (default) to adjust the displayed precision
     * automatically based on the scale of the value.
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
     * Default is true if a fixed precision is set, false if precision is 'auto'.
     */
    zeroPad?: ZeroPad;
}

export interface QuantityFormatOptions extends NumberFormatOptions {
    useMillions?: boolean;

    useBillions?: boolean;
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
 * This method delegates to numbro, @see http://numbrojs.com for more details.
 *
 * Hierarchy of params is by specificity: formatPattern, precision.
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
    if (isInvalidInput(v)) return nullDisplay;

    // Ensure any non-int precision is treated as 'auto', use to default zeroPad.
    if (!isInteger(precision)) precision = 'auto';
    if (isNil(zeroPad)) zeroPad = precision != 'auto';

    formatConfig =
        formatConfig || buildFormatConfig(v, precision, zeroPad, withCommas, omitFourDigitComma);
    const str = numbro(v).format(formatConfig).replace('-', '');
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

    const lessThanM = Math.abs(v) < MILLION,
        lessThanB = Math.abs(v) < BILLION;

    defaults(opts, {
        ledger: true,
        label: true,
        precision: lessThanM ? 0 : 2,
        useMillions: true,
        useBillions: true
    });

    if (lessThanM || !opts.useMillions) return fmtNumber(v, opts);
    if (lessThanB || !opts.useBillions) return fmtMillions(v, opts);
    return fmtBillions(v, opts);
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
        precision: MAX_NUMERIC_PRECISION,
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

    if (isString(prefix)) {
        ret += prefix;
    }

    ret += str;

    if (isString(label)) {
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

function buildFormatConfig(
    v: number,
    precisionSpec: Precision,
    zeroPad: ZeroPad,
    withCommas: boolean,
    omitFourDigitComma: boolean
): Numbro.Format {
    const absVal = Math.abs(v),
        config: Numbro.Format = {};

    let precision: number;
    if (precisionSpec === 'auto') {
        // Auto-precision - base on scale of number
        if (absVal === 0) {
            precision = 2;
        } else if (absVal < 0.01) {
            precision = 6;
        } else if (absVal < 100) {
            precision = 4;
        } else if (absVal < 10000) {
            precision = 2;
        } else {
            precision = 0;
        }
    } else {
        // Fixed precision - use requested, capped at max.
        precision = precisionSpec < MAX_NUMERIC_PRECISION ? precisionSpec : MAX_NUMERIC_PRECISION;
    }

    // If zeroPad gte precision, treat as `true` to pad out to (but not beyond) full precision.
    // We don't support applying some precision (rounding) then padding out zeroes after that.
    if (isNumber(zeroPad) && zeroPad >= precision) {
        zeroPad = true;
    }

    // Calculate numbro mantissa and trimMantissa options based on precision and zeroPad settings.
    if (isNumber(zeroPad)) {
        // Specific zeroPad set - find a specific mantissa value between zeroPad and precision.

        // Calculate the required precision of the number after rounding (since rounding can change
        // the non-zero decimal places of a number, especially in cases of js floating point
        // arithmetic errors). This is already guaranteed to be less than or equal to precision.
        const requiredPrecision = countDecimalPlaces(round(absVal, precision));

        // Then set mantissa to higher of required precision vs. requested zeroPad.
        // Ensures we display all of the requested/available precision + extra zeros if needed.
        config.mantissa = Math.max(requiredPrecision, zeroPad);
        config.trimMantissa = false;
    } else {
        // Without a specific (numeric) zeroPad set, we can set mantissa to precision then
        // optionally enable trimMantissa option to remove trailing zeroes if requested.
        // No need to measure actual precision of number.
        config.mantissa = precision;
        config.trimMantissa = !zeroPad && precision != 0;
    }

    // Apply comma-separation unless contradicted by omitFourDigitComma, which should apply only to
    // whole number values between 1000 and 9999, where we are not displaying any decimal places.
    config.thousandSeparated =
        withCommas &&
        !(
            omitFourDigitComma &&
            absVal < 10000 &&
            (config.mantissa == 0 || (!zeroPad && Number.isInteger(absVal)))
        );

    return config;
}

function countDecimalPlaces(number: number): number {
    const numStr = number.toString(),
        dpIdx = numStr.indexOf('.');
    return dpIdx === -1 ? 0 : numStr.length - dpIdx - 1;
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
        const num = +value.substring(0, value.length - 1),
            lastChar = value.charAt(value.length - 1).toLowerCase();

        switch (lastChar) {
            case 'k':
                return num * 1000;
            case 'm':
                return num * 1000000;
            case 'b':
                return num * 1000000000;
            default:
                return NaN;
        }
    }

    return parseFloat(value);
}
