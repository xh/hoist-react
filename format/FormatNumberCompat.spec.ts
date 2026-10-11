/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    fmtBillions,
    fmtMillions,
    fmtNumber,
    fmtNumberTooltip,
    fmtPercent,
    fmtPrice,
    fmtQuantity,
    fmtThousands,
    type NumberFormatOptions
} from '@xh/hoist/format';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isValidElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterAll, describe, expect, it} from 'vitest';
import baseline from './FormatNumberCompat.spec.json';

/**
 * Hoist formatted digits with numbro until v89, and with `Intl.NumberFormat` since. Apps show these
 * strings in every grid, so the first table pins the output for ordinary values, and the option
 * sets apps pass, to the strings numbro produced. The second table pins the edge cases where v89
 * output changed on purpose, with the reason for each.
 *
 * `FormatNumberCompat.spec.json` holds the numbro output. This spec wrote it in write mode at
 * commit 21f23207cb6d, the last with numbro. Never regenerate it from current code. To add a case,
 * check out that commit, copy this spec over, run
 * `XH_WRITE_NUMBRO_BASELINE=1 pnpm test FormatNumberCompat`, and copy the JSON back.
 */

const WRITE = !!process.env.XH_WRITE_NUMBRO_BASELINE;

/** Markup of a rendered element, or a string as-is. */
function html(node: ReactNode): string {
    return isValidElement(node) ? renderToStaticMarkup(node) : (node as string);
}

/** A stable key for a value. JSON and String() both lose the sign of -0. */
function key(v: number): string {
    return Object.is(v, -0) ? '-0' : String(v);
}

// Ordinary values: no negative ties, nothing in e-notation, nothing past 15 significant digits.
const positives = [
    0,
    1,
    0.01,
    0.1 + 0.2,
    1 / 3,
    Math.PI,
    0.001234567,
    0.0099,
    0.0456,
    0.004,
    0.0001,
    0.000001234,
    0.07,
    0.25,
    0.5,
    9.9999,
    12.5,
    19.99,
    42.5,
    99.99,
    99.999,
    100,
    999.999,
    1000,
    1234.5,
    1265,
    1500,
    9999.5,
    10000,
    12345.678,
    123450,
    920120.21343,
    7100100,
    123456789.12,
    1234567890.12,
    2515000000,
    123456000000000,
    44510347,
    // Half-cent ties. Each rounds up, as its decimal digits say, though 1.005 is stored as
    // 1.00499999999999989...
    1.005,
    2.675,
    0.285,
    10.235,
    1.125,
    99.995,
    0.995,
    0.015,
    1.45,
    // Values that arithmetic left one float step from a tie, e.g. 1.15 * 3 is 3.4499999999999997.
    1.15 * 3,
    0.0045 * 100,
    1.7954999999999999,
    224845.94999999998,
    (1.46 + 1.47) / 2,
    (1.13 + 1.14) / 2,
    44.324999999999996,
    (512345678901.21 + 512345678901.22) / 2
];
const negatives = [
    -0,
    -1,
    -(0.1 + 0.2),
    -0.0012,
    -0.004,
    -0.0001,
    -42.37,
    -1234.56,
    -1842343,
    -123450
];
const values = [...positives, ...negatives];

// Values for the helpers and decorations - signs, zero, values that round to zero, scale.
const fewValues = [
    0, -0, 0.0004, -0.0004, 0.456, -0.032, 12.34, -1234.567, 45000, 2512345.678, -7100000,
    1200000000
];
const helperValues = [...fewValues, 0.0045, 0.017955, -0.25];

// Ratios for percents at 4 or more places, which the larger values above would push past 15
// significant digits.
const ratioValues = helperValues.filter(v => Math.abs(v) < 1000);

const precisions: NumberFormatOptions[] = [
    {},
    {precision: null},
    ...[0, 1, 2, 3, 4, 6, 8, 12].map(precision => ({precision}) as NumberFormatOptions)
];
const zeroPads: NumberFormatOptions[] = [{}, {zeroPad: true}, {zeroPad: false}, {zeroPad: 2}];

const digitCases: [string, NumberFormatOptions][] = [
    ...precisions.flatMap(p => zeroPads.map(z => ({...p, ...z}))),
    {withCommas: false},
    {withCommas: false, precision: 2},
    {omitFourDigitComma: true},
    {omitFourDigitComma: true, precision: 0},
    {omitFourDigitComma: true, precision: 2},
    {omitFourDigitComma: true, precision: 2, zeroPad: false},
    {precision: 2, zeroPad: 4}
].map(opts => [JSON.stringify(opts), opts as NumberFormatOptions]);

// Option sets apps pass, from a scan of real apps and of Hoist's own callers.
const decorationCases: [string, NumberFormatOptions][] = [
    ['ledger', {precision: 2, ledger: true}],
    ['ledger, no align', {precision: 0, ledger: true, forceLedgerAlign: false}],
    ['ledger, colorSpec', {precision: 0, ledger: true, colorSpec: true}],
    ['ledger, colorSpec, asHtml', {precision: 2, ledger: true, colorSpec: true, asHtml: true}],
    ['plus sign and prefix', {precision: 2, withPlusSign: true, prefix: '$'}],
    ['prefix', {precision: 0, prefix: '$'}],
    ['label', {label: 'ms'}],
    ['label, no labelCls', {precision: 1, label: ' days', labelCls: null}],
    ['label, tooltip', {precision: 1, tooltip: true, label: 'mb'}],
    [
        'label, full precision, asHtml',
        {precision: null, zeroPad: false, label: ' px', labelCls: null, asHtml: true}
    ],
    [
        'currency label',
        {precision: 0, label: 'USD', labelCls: 'my-units', ledger: true, forceLedgerAlign: false}
    ],
    [
        'price, plus sign, zeroDisplay',
        {
            precision: 4,
            zeroPad: true,
            withPlusSign: true,
            zeroDisplay: '+0.0000',
            nullDisplay: '-',
            asHtml: true
        }
    ],
    ['colorSpec, sign glyph', {precision: 0, colorSpec: true, withSignGlyph: true}],
    [
        'colorSpec classes',
        {precision: 2, prefix: '$', colorSpec: {pos: 'my-pos', neutral: 'my-neutral'}}
    ],
    [
        'colorSpec class, asHtml',
        {prefix: '$', colorSpec: {pos: 'xh-intent-danger'}, precision: 0, asHtml: true}
    ],
    ['colorSpec styles', {precision: 1, colorSpec: {pos: {color: 'green'}, neg: {color: 'red'}}}],
    ['strictZero false', {precision: 2, strictZero: false, withPlusSign: true, colorSpec: true}],
    ['zeroDisplay', {precision: 1, zeroDisplay: '-', zeroPad: false}],
    ['tooltip', {precision: 1, tooltip: true}],
    [
        'tooltip function',
        {
            precision: 0,
            ledger: true,
            tooltip: v => fmtNumber(v, {precision: 2, asHtml: true}) as string
        }
    ],
    ['money in k', {precision: 0, prefix: '$', label: 'k', asHtml: true}],
    ['number input', {precision: 4, zeroPad: false, label: '%', labelCls: null, asHtml: true}],
    [
        'rate, minimal padding',
        {precision: 8, zeroPad: 2, label: '%', labelCls: null, nullDisplay: '-'}
    ],
    ['admin elapsed', {label: 'ms', nullDisplay: '-', precision: 0, withCommas: false}]
];

const helperCases: [string, (v: number) => ReactNode, number[]?][] = [
    ['fmtThousands label', v => fmtThousands(v, {label: true})],
    ['fmtThousands $ label', v => fmtThousands(v, {precision: 0, prefix: '$', label: true})],
    ['fmtMillions 1dp label', v => fmtMillions(v, {precision: 1, label: true, labelCls: null})],
    [
        'fmtMillions 3dp ledger tooltip',
        v => fmtMillions(v, {precision: 3, ledger: true, tooltip: true})
    ],
    [
        'fmtMillions 2dp $ label asHtml',
        v => fmtMillions(v, {precision: 2, prefix: '$', label: true, asHtml: true})
    ],
    [
        'fmtMillions 1dp $ ledger colorSpec',
        v =>
            fmtMillions(v, {
                precision: 1,
                prefix: '$',
                label: 'm',
                ledger: true,
                colorSpec: {neg: 'xh-neg-val'}
            })
    ],
    ['fmtBillions 2dp label', v => fmtBillions(v, {precision: 2, label: true, asHtml: true})],
    ['fmtBillions 0dp label', v => fmtBillions(v, {precision: 0, label: true, asHtml: true})],
    ['fmtQuantity', v => fmtQuantity(v)],
    [
        'fmtQuantity lossless',
        v => fmtQuantity(v, {lossless: true, labelCls: null, forceLedgerAlign: false})
    ],
    ['fmtQuantity no billions', v => fmtQuantity(v, {useBillions: false, asHtml: true})],
    ['fmtPrice', v => fmtPrice(v)],
    ['fmtPrice 2dp $', v => fmtPrice(v, {precision: 2, prefix: '$', asHtml: true})],
    ['fmtPercent', v => fmtPercent(v)],
    [
        'fmtPercent 0dp glyph',
        v => fmtPercent(v, {precision: 0, colorSpec: true, withSignGlyph: true})
    ],
    ['fmtPercent 1dp', v => fmtPercent(v, {precision: 1})],
    ['fmtPercent 3dp asHtml', v => fmtPercent(v, {precision: 3, asHtml: true})],
    [
        'fmtPercent 4dp ledger colorSpec',
        v => fmtPercent(v, {precision: 4, ledger: true, colorSpec: true}),
        ratioValues
    ],
    [
        'fmtPercent 8dp plus sign',
        v => fmtPercent(v, {precision: 8, zeroPad: false, withPlusSign: true, nullDisplay: '-'}),
        ratioValues
    ],
    ['fmtNumberTooltip', v => fmtNumberTooltip(v)],
    ['fmtNumberTooltip ledger', v => fmtNumberTooltip(v, {ledger: true})]
];

const written: Record<string, Record<string, string>> = {};

function check(table: string, name: string, vals: number[], fmt: (v: number) => ReactNode) {
    const actual: Record<string, string> = {};
    vals.forEach(v => (actual[key(v)] = html(fmt(v))));
    if (WRITE) {
        written[`${table} ${name}`] = actual;
    } else {
        expect(actual).toEqual(baseline[`${table} ${name}`]);
    }
}

describe('Number formatters match the numbro baseline for ordinary values', () => {
    afterAll(() => {
        if (WRITE) {
            const file = join(import.meta.dirname, 'FormatNumberCompat.spec.json');
            writeFileSync(file, JSON.stringify(written, null, 1) + '\n');
        }
    });

    // A double holds 15 significant digits. Rows leave out values that a fixed precision would
    // push past that, where numbro printed float noise.
    it.each(digitCases)('digits %s', (name, opts) => {
        const p = opts.precision,
            vals = values.filter(
                v => !(Number.isInteger(p) && Math.abs(v) * 10 ** (p as number) >= 1e15)
            );
        check('digits', name, vals, v => fmtNumber(v, opts));
    });

    it.each(decorationCases)('options: %s', (name, opts) =>
        check('options', name, [...fewValues, null], v => fmtNumber(v, opts))
    );

    it.each(helperCases)('%s', (name, fmt, vals = helperValues) =>
        check('helpers', name, vals, fmt)
    );
});

// Each row: the input, what v89 shows, what numbro showed. Write mode skips this table, which
// fails on numbro.
describe.skipIf(WRITE)('Number formatter edge cases that changed on purpose in v89', () => {
    it.each<[string, string, string, () => ReactNode]>([
        // Ties round half away from zero for both signs. numbro took negative ties toward zero.
        ['-2.5 at 0dp', '-3', '-2', () => fmtNumber(-2.5, {precision: 0})],
        ['-1.005 at 2dp', '-1.01', '-1.00', () => fmtNumber(-1.005, {precision: 2})],
        [
            '-1.125 at 2dp, ledger',
            '(1.13)',
            '(1.12)',
            () => fmtNumber(-1.125, {precision: 2, ledger: true, forceLedgerAlign: false})
        ],
        [
            '-0.005 at 2dp, strictZero false',
            '-0.01',
            '0.00',
            () => fmtNumber(-0.005, {precision: 2, strictZero: false})
        ],
        // A negative value that arithmetic left just below a tie rounds as a positive one does.
        ['fmtPercent(-0.0045) at 1dp', '-0.5%', '-0.4%', () => fmtPercent(-0.0045, {precision: 1})],
        // Values below 1e-6 round like any other. numbro truncated values in e-notation.
        [
            '9.9999999e-7 at 6dp',
            '0.000001',
            '0.000000',
            () => fmtNumber(9.9999999e-7, {precision: 6})
        ],
        ['5e-7 at auto precision', '0.000001', '0', () => fmtNumber(5e-7)],
        [
            'fmtMillions(0.5)',
            '0.000001m',
            '0m',
            () => fmtMillions(0.5, {label: true, labelCls: null})
        ],
        [
            '1e-7 at 8dp, zeroPad 2',
            '0.0000001',
            '0.00',
            () => fmtNumber(1e-7, {precision: 8, zeroPad: 2})
        ],
        // Past 15 significant digits Intl formats the value as it is, with no float noise from a
        // decimal shift.
        [
            '2390421244 at 12dp',
            '2,390,421,244.000000000000',
            '2,390,421,243.999999500000',
            () => fmtNumber(2390421244, {precision: 12})
        ],
        [
            '-307720365289.33826 at 4dp',
            '-307,720,365,289.3383',
            '-307,720,365,289.3382',
            () => fmtNumber(-307720365289.33826, {precision: 4})
        ],
        [
            '486868540.05791247 at 8dp',
            '486,868,540.05791247',
            '486,868,540.05791247',
            () => fmtNumber(486868540.05791247, {precision: 8})
        ],
        // Infinity shows the Intl symbol, with Hoist's sign and ledger.
        ['Infinity', '∞', 'Infinity', () => fmtNumber(Infinity)],
        [
            '-Infinity, ledger',
            '(∞)',
            '(Infinity)',
            () => fmtNumber(-Infinity, {ledger: true, forceLedgerAlign: false})
        ],
        // NaN and -0 are unchanged.
        ['NaN', 'NaN', 'NaN', () => fmtNumber(NaN)],
        ['-0 at 2dp', '0.00', '0.00', () => fmtNumber(-0, {precision: 2})],
        // Strings are not parsed. A plain decimal string formats as its number, any other is NaN.
        [
            "'-1234.5' at 2dp",
            '-1,234.50',
            '-1,234.50',
            () => fmtNumber('-1234.5' as any, {precision: 2})
        ],
        ["'1,234.5' at 2dp", 'NaN', '1,234.50', () => fmtNumber('1,234.5' as any, {precision: 2})],
        ["'N/A'", 'NaN', 'a TypeError', () => fmtNumber('N/A' as any)],
        // A numeric zeroPad of 0 is the same as false.
        [
            '1234.0001 at 2dp, zeroPad 0, omitFourDigitComma',
            '1,234',
            '1234',
            () => fmtNumber(1234.0001, {precision: 2, zeroPad: 0, omitFourDigitComma: true})
        ],
        // Precision is clamped to 0-12, so a negative one cannot reach the Intl range check.
        [
            'precision -1 on 5.5',
            '6',
            'ERROR: invalid format',
            () => fmtNumber(5.5, {precision: -1 as any})
        ]
    ])('%s: %s (was %s)', (_, expected, was, fmt) => {
        expect(html(fmt())).toBe(expected);
    });

    it('throws for the removed formatConfig option, naming its replacements', () => {
        const opts = {formatConfig: {thousandSeparated: false, mantissa: 0}} as any;
        expect(() => fmtNumber(1234, opts)).toThrow("Use 'precision', 'zeroPad' and 'withCommas'");
        expect(() => fmtNumber(null, opts)).toThrow('formatConfig');
    });
});
