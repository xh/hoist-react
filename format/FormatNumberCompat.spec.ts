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
 * Number formatters render the numbers in nearly every Hoist grid. This spec pins their output for
 * ordinary values and for the option sets apps pass, so a change to how Hoist formats digits
 * cannot change what apps show.
 *
 * `FormatNumberCompat.spec.json` holds the expected strings, which numbro formatted. This spec
 * wrote them once in write mode: `XH_WRITE_NUMBRO_BASELINE=1 pnpm test FormatNumberCompat`. Never
 * regenerate them with any other digit formatter.
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
    44.324999999999996
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
    ...[0, 1, 2, 4, 6, 8, 12].map(precision => ({precision}) as NumberFormatOptions)
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
