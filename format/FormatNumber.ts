/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {defaults, isBoolean, isFinite, isFunction, isNil, isString} from 'lodash';
import Numbro from 'numbro';
import numbro from 'numbro';
import {CSSProperties, ReactNode} from 'react';
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

export interface NumberFormatOptions extends Omit<FormatOptions<number>, 'tooltip'> {
    /** A valid numbro format object or string. */
    formatConfig?: string | Numbro.Format;

    /** Desired number of decimal places. */
    precision?: number | 'auto';

    /** True to pad with trailing zeros out to given precision. */
    zeroPad?: boolean;

    /** Optional display value for the input value 0. */
    zeroDisplay?: ReactNode;

    /** True to use ledger format. */
    ledger?: boolean;

    /**
     * True to add placeholder after positive ledgers to align vertically with negative ledgers
     * in columns.
     */
    forceLedgerAlign?: boolean;

    /** True to prepend positive numbers with a '+'. */
    withPlusSign?: boolean;

    /**
     * If set to false, small numbers that would show only digits of zero due to precision will be
     * formatted as exactly zero. In particular, if a zeroDisplay is specified it will be used and
     * sign-based glyphs, '+/-' characters, and colors will not be shown.  Default true.
     */
    strictZero?: boolean;

    /** True to prepend an up / down arrow. */
    withSignGlyph?: boolean;

    /** True to include comma delimiters. */
    withCommas?: boolean;

    /** Set to true to omit comma if value has exactly 4 digits (i.e. 1500 instead of 1,500). */
    omitFourDigitComma?: boolean;

    /** Prefix to prepend to value (between the number and its sign). */
    prefix?: string;

    /** Label to append to value, or true to append a default label for the formattter
     * e.g. 'm' for fmtMillions.
     */
    label?: string | boolean;

    /** CSS class of label span. */
    labelCls?: string;

    /**
     * Color output based on the sign of the value. True to use red/green/grey defaults, or provide
     * an object with alternate CSS classes or properties.
     */
    colorSpec?: boolean | ColorSpec;

    /**
     * True to enable default tooltip with minimally formatted original value, or a function to
     * generate a custom tooltip string.
     */
    tooltip?: boolean | ((v: number) => string);
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
 * @returns a ReactNode, for an HTML string see {@link fmtDateAsHtml}
 */
export function fmtNumber(v: number, opts?: NumberFormatOptions): ReactNode {
    let {
        nullDisplay = '',
        zeroDisplay = null,
        formatConfig = null,
        precision = 'auto',
        zeroPad = precision != 'auto',
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
    } = opts ?? {};

    if (isInvalidInput(v)) return nullDisplay;

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

function buildFormatConfig(v, precision, zeroPad, withCommas, omitFourDigitComma): Numbro.Format {
    const num = Math.abs(v);

    const config: Numbro.Format = {};
    let mantissa = undefined;

    if (precision % 1 === 0) {
        precision = precision < MAX_NUMERIC_PRECISION ? precision : MAX_NUMERIC_PRECISION;
        mantissa = precision === 0 ? 0 : precision;
    } else {
        if (num === 0) {
            mantissa = 2;
        } else if (num < 0.01) {
            mantissa = 6;
        } else if (num < 100) {
            mantissa = 4;
        } else if (num < 10000) {
            mantissa = 2;
        } else {
            mantissa = 0;
        }
    }

    config.thousandSeparated =
        withCommas &&
        !(
            omitFourDigitComma &&
            num < 10000 &&
            (mantissa == 0 || (!zeroPad && Number.isInteger(num)))
        );
    config.mantissa = mantissa;
    config.trimMantissa = !zeroPad && mantissa != 0;
    return config;
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
