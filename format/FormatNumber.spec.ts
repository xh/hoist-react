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
    millionsRenderer,
    type NumberFormatOptions,
    parseNumber
} from '@xh/hoist/format';
import {isValidElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

/**
 * Number formatters render the numbers in nearly every Hoist grid and display. These tests pin the
 * logic Hoist adds on top of `Intl.NumberFormat`: precision, rounding and zero padding, signs and
 * ledger format, colors by sign, unit scaling and tooltips, the string-or-element return contract,
 * and shorthand parsing.
 */

/** Markup of a rendered element, or a string as-is. */
function html(node: ReactNode): string {
    return isValidElement(node) ? renderToStaticMarkup(node) : (node as string);
}

/** Text of a rendered element or HTML string, as a browser displays it. */
function text(node: ReactNode): string {
    return new DOMParser().parseFromString(html(node), 'text/html').body.textContent;
}

describe('fmtNumber', () => {
    describe('precision', () => {
        it.each([
            [12345.678, '12,346'],
            [1234.5678, '1,234.57'],
            [12.3456789, '12.3457'],
            [0.001234567, '0.001235'],
            [0, '0']
        ])('scales decimal places to the magnitude of %s by default', (v, expected) => {
            expect(fmtNumber(v)).toBe(expected);
        });

        it('pads a fixed precision with trailing zeros', () => {
            expect(fmtNumber(1.2, {precision: 4})).toBe('1.2000');
            expect(fmtNumber(1234, {precision: 2})).toBe('1,234.00');
        });

        // 86.2.0 (#4447): null fell back to 'auto', so NumberInput's blurred display was rounded.
        it('renders full precision with trailing zeros trimmed when precision is null', () => {
            expect(fmtNumber(1 / 3, {precision: null})).toBe('0.333333333333');
            expect(fmtNumber(1.5, {precision: null})).toBe('1.5');
            expect(fmtNumber(123456.789, {precision: null})).toBe('123,456.789');
        });

        it('treats an undefined precision as auto, unlike null', () => {
            expect(fmtNumber(1 / 3, {precision: undefined})).toBe('0.3333');
        });
    });

    describe('zeroPad', () => {
        it.each([
            [1.2, {precision: 4, zeroPad: 2}, '1.20'],
            [1.234, {precision: 4, zeroPad: 2}, '1.234'],
            [1.23456, {precision: 4, zeroPad: 2}, '1.2346'],
            [5, {zeroPad: 2}, '5.00'],
            [12345.678, {zeroPad: 2}, '12,346'],
            [Math.PI, {precision: 2, zeroPad: 4}, '3.14'],
            [1234.5, {precision: 0, zeroPad: 2}, '1,235']
        ] as const)('formats %s with %o as "%s"', (v, opts, expected) => {
            expect(fmtNumber(v, opts)).toBe(expected);
        });

        // #3752: spurious floating point precision defeated a numeric zeroPad.
        it('ignores floating point noise when padding', () => {
            expect(fmtNumber(0.1 + 0.2, {precision: 4, zeroPad: 2})).toBe('0.30');
        });

        it('keeps the trailing zeros of whole numbers when trimming', () => {
            expect(fmtNumber(123450, {precision: 0, zeroPad: false})).toBe('123,450');
            expect(fmtNumber(100, {precision: null})).toBe('100');
        });

        // A computed zeroPad can be fractional. Its call must not change how other calls format.
        it('formats a fractional zeroPad without affecting other calls', () => {
            const v = 1.23456789012;
            expect(fmtNumber(v, {precision: 4, zeroPad: 1.5 as any})).toBe('1.2346');
            expect(fmtNumber(v, {precision: 12, zeroPad: 1})).toBe('1.23456789012');
        });

        it('treats a zeroPad of 0 as false', () => {
            const opts: NumberFormatOptions = {precision: 2, omitFourDigitComma: true};
            expect(fmtNumber(1234, {...opts, zeroPad: 0})).toBe('1234');
            expect(fmtNumber(1234.0001, {...opts, zeroPad: 0})).toBe('1,234');
            expect(fmtNumber(1234.0001, {...opts, zeroPad: false})).toBe('1,234');
        });
    });

    describe('withCommas and omitFourDigitComma', () => {
        it.each([
            [1234.5, {withCommas: false, precision: 2}, '1234.50'],
            [1500, {omitFourDigitComma: true}, '1500'],
            [10000, {omitFourDigitComma: true}, '10,000'],
            [1234.5, {omitFourDigitComma: true, precision: 0}, '1235'],
            [1500, {omitFourDigitComma: true, precision: 2}, '1,500.00'],
            [1500, {omitFourDigitComma: true, precision: 2, zeroPad: false}, '1500']
        ] as const)('formats %s with %o as "%s"', (v, opts, expected) => {
            expect(fmtNumber(v, opts)).toBe(expected);
        });
    });

    describe('rounding', () => {
        // A tie rounds half away from zero on its decimal digits, though 1.005 is stored as
        // 1.00499999999999989...
        it.each([
            [1.005, 2, '1.01'],
            [2.675, 2, '2.68'],
            [0.285, 2, '0.29'],
            [99.995, 2, '100.00'],
            [1.45, 1, '1.5'],
            [9999.5, 0, '10,000'],
            [-2.5, 0, '-3'],
            [-1.005, 2, '-1.01']
        ] as const)('rounds the tie %s with precision %s to "%s"', (v, precision, expected) => {
            expect(fmtNumber(v, {precision})).toBe(expected);
        });

        // Arithmetic can leave a value one float step from a tie: 1.15 * 3 is 3.4499999999999997.
        it.each([
            [1.15 * 3, 1, '3.5'],
            [-(1.15 * 3), 1, '-3.5'],
            [1.7954999999999999, 3, '1.796'],
            [224845.94999999998, 1, '224,846.0'],
            [(512345678901.21 + 512345678901.22) / 2, 2, '512,345,678,901.22']
        ] as const)(
            'rounds %s with precision %s to "%s", as the arithmetic intended',
            (v, p, expected) => {
                expect(fmtNumber(v, {precision: p})).toBe(expected);
            }
        );

        it('rounds a percent that scaling by 100 left one float step from a tie', () => {
            expect(fmtPercent(0.0045, {precision: 1})).toBe('0.5%');
            expect(fmtPercent(-0.0045, {precision: 1})).toBe('-0.5%');
        });

        it('shows values below 1e-6 as zero at auto precision', () => {
            expect(fmtNumber(5e-7)).toBe('0');
            expect(fmtNumber(1e-6)).toBe('0.000001');
            expect(fmtMillions(0.5, {label: true, labelCls: null})).toBe('0m');
            expect(fmtMillions(1.5, {label: true, labelCls: null})).toBe('0.000002m');
        });

        it('rounds values below 1e-6 like any other at fixed precision', () => {
            expect(fmtNumber(9.9999999e-7, {precision: 6})).toBe('0.000001');
        });

        it('keeps the sign of a value below 1e-6 at auto precision', () => {
            expect(fmtNumber(-5e-7)).toBe('-0');
            expect(fmtNumber(5e-7, {withPlusSign: true})).toBe('+0');
            expect(fmtNumber(-5e-7, {ledger: true, forceLedgerAlign: false})).toBe('(0)');
            expect(html(fmtNumber(-5e-7, {colorSpec: true}))).toBe(
                '<span class="xh-neg-val">-0</span>'
            );
        });

        it('shows a value past 15 significant digits as stored, without float noise', () => {
            expect(fmtNumber(2390421244, {precision: 12})).toBe('2,390,421,244.000000000000');
            expect(fmtNumber(-307720365289.33826, {precision: 4})).toBe('-307,720,365,289.3383');
            expect(fmtNumber(486868540.05791247, {precision: 8})).toBe('486,868,540.05791247');
        });

        it('clamps precision to 0-12', () => {
            expect(fmtNumber(5.5, {precision: -1 as any})).toBe('6');
            expect(fmtNumber(1 / 3, {precision: 20 as any})).toBe('0.333333333333');
        });
    });

    describe('signs, prefix and ledger', () => {
        it.each([
            [-5, {prefix: '$'}, '-$5'],
            [5, {prefix: '$', withPlusSign: true}, '+$5'],
            [5, {withPlusSign: true, ledger: true}, '+5']
        ] as const)('formats %s with %o as "%s"', (v, opts, expected) => {
            expect(fmtNumber(v, {...opts, forceLedgerAlign: false})).toBe(expected);
        });

        it('encloses the prefix and label within ledger parentheses', () => {
            const opts: NumberFormatOptions = {prefix: '$', label: 'm', labelCls: null};
            expect(fmtNumber(-5, {...opts, ledger: true, forceLedgerAlign: false})).toBe('($5m)');
        });

        it('pads positive ledger values to align with the parentheses of negatives', () => {
            const opts: NumberFormatOptions = {precision: 2, ledger: true, asHtml: true};
            expect(fmtNumber(1234.56, opts)).toBe(
                '1,234.56<span style="visibility:hidden">)</span>'
            );
            expect(fmtNumber(-1234.56, opts)).toBe('(1,234.56)');
        });
    });

    describe('strictZero and zeroDisplay', () => {
        // #3430: values that round to zero rendered as '-0.00'. strictZero: false is the opt-in fix.
        it('treats a value that rounds to zero as zero only when strictZero is false', () => {
            expect(fmtNumber(-0.0001, {precision: 2})).toBe('-0.00');

            const opts: NumberFormatOptions = {precision: 2, strictZero: false};
            expect(fmtNumber(-0.0001, opts)).toBe('0.00');
            expect(fmtNumber(0.0001, {...opts, withPlusSign: true})).toBe('0.00');
            expect(fmtNumber(-0.0001, {...opts, zeroDisplay: '--'})).toBe('--');
            expect(html(fmtNumber(-0.0001, {...opts, colorSpec: true}))).toBe(
                '<span class="xh-neutral-val">0.00</span>'
            );
        });

        it('returns zeroDisplay for a value below 1e-6 at auto precision only when strictZero is false', () => {
            expect(fmtNumber(5e-7, {zeroDisplay: '-'})).toBe('0');
            expect(fmtNumber(-5e-7, {zeroDisplay: '-', strictZero: false})).toBe('-');
        });

        it('returns zeroDisplay for zero', () => {
            expect(fmtNumber(0, {zeroDisplay: '-'})).toBe('-');
        });
    });

    it('returns nullDisplay for null, undefined and empty input', () => {
        expect(fmtNumber(null)).toBe('');
        expect(fmtNumber(null, {nullDisplay: '-'})).toBe('-');
        expect(fmtNumber(undefined, {nullDisplay: '-'})).toBe('-');
        expect(fmtNumber('' as any, {nullDisplay: '-'})).toBe('-');
    });

    it('renders Infinity as ∞, with the sign and ledger format of other values', () => {
        expect(fmtNumber(Infinity)).toBe('∞');
        expect(fmtNumber(-Infinity, {ledger: true, forceLedgerAlign: false})).toBe('(∞)');
    });

    it('renders NaN as NaN and -0 as zero', () => {
        expect(fmtNumber(NaN)).toBe('NaN');
        expect(fmtNumber(-0, {precision: 2})).toBe('0.00');
    });

    // Apps should parse formatted text with parseNumber() first.
    it('reads a string as Number() does', () => {
        expect(fmtNumber('-1234.5' as any, {precision: 2})).toBe('-1,234.50');
        expect(fmtNumber('1,234.5' as any, {precision: 2})).toBe('NaN');
        expect(fmtNumber('N/A' as any)).toBe('NaN');
    });

    it('rejects the removed formatConfig option, at compile time and when called', () => {
        // Each call is a compile error - `pnpm typecheck` fails if one stops being one.
        const msg = "Use 'precision', 'zeroPad' and 'withCommas'",
            formatConfig = {thousandSeparated: false, mantissa: 0},
            opts = {formatConfig};
        // @ts-expect-error - formatConfig
        expect(() => fmtNumber(1234, {formatConfig})).toThrow(msg);
        // @ts-expect-error - formatConfig, by variable
        expect(() => fmtNumber(1234, opts)).toThrow(msg);
        // @ts-expect-error - formatConfig, by spread, for a null value
        expect(() => fmtNumber(null, {...opts, ledger: true})).toThrow('formatConfig');
    });

    // Apps interpolate formatter output into strings, e.g. chart tooltips and labels. Output must
    // stay a plain string unless an option needs markup.
    describe('return type', () => {
        it('returns a plain string when no option needs markup', () => {
            expect(fmtNumber(1234.5, {prefix: '$', withPlusSign: true})).toBeTypeOf('string');
            expect(fmtNumber(-5, {ledger: true, forceLedgerAlign: false})).toBeTypeOf('string');
            expect(fmtNumber(5, {label: 'k', labelCls: null})).toBeTypeOf('string');
            // 1f24d2413: an empty label added an empty label span.
            expect(fmtNumber(5, {label: ''})).toBe('5');
        });

        it('returns an element when an option needs markup, or an HTML string with asHtml', () => {
            const optionSets: NumberFormatOptions[] = [
                {colorSpec: true},
                {tooltip: true},
                {withSignGlyph: true},
                {ledger: true},
                {label: 'k'}
            ];
            for (const opts of optionSets) {
                const msg = JSON.stringify(opts);
                expect(isValidElement(fmtNumber(-1234.5, opts)), msg).toBe(true);
                expect(fmtNumber(-1234.5, {...opts, asHtml: true}), msg).toBeTypeOf('string');
            }
        });

        // The element and HTML paths are coded separately and have drifted before (#2957).
        it('renders the same text as an element and as HTML', () => {
            const optionSets: NumberFormatOptions[] = [
                {ledger: true},
                {colorSpec: true},
                {withSignGlyph: true},
                {label: 'k'},
                {tooltip: true},
                {ledger: true, colorSpec: true, withSignGlyph: true, prefix: '$', label: 'k'},
                {precision: 2, strictZero: false, withPlusSign: true, colorSpec: true}
            ];
            for (const opts of optionSets) {
                for (const v of [-1234.567, -0.001, 0, 1234.567]) {
                    const asHtml = fmtNumber(v, {...opts, asHtml: true});
                    expect(text(fmtNumber(v, opts)), `${v} ${JSON.stringify(opts)}`).toBe(
                        text(asHtml)
                    );
                }
            }
        });
    });

    describe('colorSpec', () => {
        it('applies the default class for the sign of the value', () => {
            expect(html(fmtNumber(-5, {colorSpec: true}))).toBe(
                '<span class="xh-neg-val">-5</span>'
            );
            expect(html(fmtNumber(5, {colorSpec: true}))).toBe('<span class="xh-pos-val">5</span>');
            expect(html(fmtNumber(0, {colorSpec: true}))).toBe(
                '<span class="xh-neutral-val">0</span>'
            );
        });

        // #1270: a spec with only some signs set must be supported.
        it('applies only the classes given in a partial spec', () => {
            const colorSpec = {neg: 'my-neg'};
            expect(html(fmtNumber(-5, {colorSpec}))).toBe('<span class="my-neg">-5</span>');
            expect(html(fmtNumber(5, {colorSpec}))).not.toContain('xh-pos-val');
        });

        // #3402: a spec can hold CSS properties in place of class names.
        it('applies CSS properties from the spec as inline styles', () => {
            const colorSpec = {neg: {color: 'red'}};
            expect(html(fmtNumber(-5, {colorSpec}))).toContain('style="color:red"');
            expect(fmtNumber(-5, {colorSpec, asHtml: true})).toBe(
                '<span style="color: red;">-5</span>'
            );
        });
    });

    describe('withSignGlyph', () => {
        it('replaces the sign with an arrow, and keeps a hidden arrow for zero', () => {
            expect(text(fmtNumber(5, {withSignGlyph: true}))).toBe('▴5');
            expect(text(fmtNumber(-5, {withSignGlyph: true}))).toBe('▾5');
            expect(html(fmtNumber(0, {withSignGlyph: true}))).toContain(
                '<span class="xh-transparent">▴</span>0'
            );
        });
    });
});

describe('fmtNumberTooltip', () => {
    it('renders the value at full precision, without padding', () => {
        expect(fmtNumberTooltip(1234.123456789)).toBe('1,234.123456789');
        expect(fmtNumberTooltip(1234.5)).toBe('1,234.5');
        expect(fmtNumberTooltip(0.1 + 0.2)).toBe('0.3');
    });

    it('renders ledger format without the alignment placeholder', () => {
        expect(fmtNumberTooltip(-1234.5, {ledger: true})).toBe('(1,234.5)');
        expect(fmtNumberTooltip(1234.5, {ledger: true})).toBe('1,234.5');
    });

    // Fixed in 89.0.0 - 12 decimal places exceeded double precision for large values, adding
    // spurious digits, e.g. '44,510,347.00000001'.
    it('renders large values without spurious digits', () => {
        expect(fmtNumberTooltip(44510347)).toBe('44,510,347');
        expect(fmtNumberTooltip(2390421244)).toBe('2,390,421,244');
        expect(fmtNumber(2515000000, {precision: null})).toBe('2,515,000,000');
    });
});

describe('fmtThousands, fmtMillions and fmtBillions', () => {
    it.each([
        ['fmtThousands', fmtThousands, 45000, '45k'],
        ['fmtMillions', fmtMillions, 2500000, '2.5m'],
        ['fmtBillions', fmtBillions, 1200000000, '1.2b']
    ] as const)('%s scales the value and appends its default label', (_, fmt, v, expected) => {
        expect(fmt(v, {label: true, labelCls: null})).toBe(expected);
    });

    it('shows the unscaled value in a tooltip', () => {
        expect(html(fmtMillions(-2512345.678, {precision: 3, ledger: true, tooltip: true}))).toBe(
            '<span class="xh-title-tip" title="(2,512,345.678)">(2.512)</span>'
        );

        const tooltip = vi.fn(() => 'tip');
        fmtMillions(2512345, {tooltip});
        expect(tooltip).toHaveBeenCalledWith(2512345);
    });
});

describe('fmtQuantity', () => {
    // Plain-string output, for readable expectations.
    const strOpts = {labelCls: null, forceLedgerAlign: false};

    it.each([
        [500000, '500,000'],
        [2500000, '2.50m'],
        [-2500000, '(2.50m)'],
        [1200000000, '1.20b']
    ])('formats %s as "%s"', (v, expected) => {
        expect(fmtQuantity(v, strOpts)).toBe(expected);
    });

    it('compacts billions into millions when useBillions is false', () => {
        expect(fmtQuantity(1200000000, {...strOpts, useBillions: false})).toBe('1,200.00m');
    });

    // Fixed in 89.0.0 - values of 1m or more defaulted to 2 places, even when left unscaled.
    it('renders an unscaled value as a whole number', () => {
        expect(fmtQuantity(2500000, {...strOpts, useMillions: false})).toBe('2,500,000');
    });

    // 86.2.0 (#4454): lossless compacts into m/b units only when no digits are lost.
    describe('lossless', () => {
        it.each([
            [7100100, '7,100,100'],
            [7120000, '7.12m'],
            [7100000, '7.1m'],
            [-7100000, '(7.1m)'],
            [5000000000, '5b'],
            [1234.5678, '1,234.5678']
        ])('formats %s as "%s"', (v, expected) => {
            expect(fmtQuantity(v, {...strOpts, lossless: true})).toBe(expected);
        });

        it('judges loss against a precision set by the caller', () => {
            const opts = {...strOpts, lossless: true};
            expect(fmtQuantity(7123456, opts)).toBe('7,123,456');
            expect(fmtQuantity(7123456, {...opts, precision: 6})).toBe('7.123456m');
        });
    });
});

describe('fmtPrice', () => {
    it.each([
        [42.5, '42.50'],
        [-42.5, '-42.50'],
        [1500, '1,500'],
        [0, '0']
    ])('formats %s as "%s"', (v, expected) => {
        expect(fmtPrice(v)).toBe(expected);
    });
});

describe('fmtPercent', () => {
    // #1225: fmtPercent multiplies by 100, matching Excel and ExportFormat.PCT.
    it.each([
        [0.456, {}, '45.60%'],
        [0.456, {precision: 0}, '46%'],
        [0.07, {}, '7.00%']
    ] as const)('formats the ratio %s with %o as "%s"', (v, opts, expected) => {
        expect(fmtPercent(v, opts)).toBe(expected);
    });

    it('colors and marks the sign of a change', () => {
        const opts: NumberFormatOptions = {precision: 1, colorSpec: true, withSignGlyph: true};
        expect(html(fmtPercent(-0.032, opts))).toBe('<span class="xh-neg-val">▾3.2%</span>');
    });
});

describe('Number formatters', () => {
    const wrappers = {fmtThousands, fmtMillions, fmtBillions, fmtQuantity, fmtPrice, fmtPercent};

    it('return nullDisplay for null input, without scaling it', () => {
        for (const [name, fmt] of Object.entries(wrappers)) {
            expect(fmt(null, {nullDisplay: '-'}), name).toBe('-');
        }
    });

    // #2404: formatters modified their options, which a renderer shares across a whole column.
    it('do not modify the options passed in', () => {
        for (const [name, fmt] of Object.entries({fmtNumber, ...wrappers})) {
            const opts = {precision: 1, label: true, ledger: true, tooltip: true} as const;
            fmt(-2500000, opts);
            expect(opts, name).toEqual({precision: 1, label: true, ledger: true, tooltip: true});
        }
    });

    it('keep each cell independent when a renderer shares one config', () => {
        const renderer = millionsRenderer({precision: 1, tooltip: true});
        expect(html(renderer(1234567))).toBe(
            '<span class="xh-title-tip" title="1,234,567">1.2</span>'
        );
        expect(html(renderer(9876543))).toBe(
            '<span class="xh-title-tip" title="9,876,543">9.9</span>'
        );
    });
});

describe('parseNumber', () => {
    it.each([
        ['1.5k', 1500],
        ['1.5K', 1500],
        ['2.5m', 2500000],
        ['0.5b', 500000000],
        ['-1.5k', -1500],
        ['.5m', 500000],
        ['1,234.5', 1234.5],
        ['0', 0],
        [1500, 1500]
    ])('parses %o as %s', (input, expected) => {
        expect(parseNumber(input)).toBe(expected);
    });

    it('returns null for empty input', () => {
        expect(parseNumber(null)).toBeNull();
        expect(parseNumber(undefined)).toBeNull();
        expect(parseNumber('')).toBeNull();
    });

    it('returns NaN for input that is not a number', () => {
        expect(parseNumber('abc')).toBeNaN();
    });

    // Fixed in 89.0.0 - multiplying by the unit left float artifacts, so a filter of
    // 'value = 8.2m' missed a value of exactly 8,200,000.
    it('parses decimal shorthand to the exact value', () => {
        expect(parseNumber('8.2m')).toBe(8200000);
        expect(parseNumber('1.005k')).toBe(1005);
    });
});
