/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {forEach, isEmpty, isFinite, isNil, isString} from 'lodash';
import {ReactNode} from 'react';
import {
    ColorClassSpec,
    fmtBillions,
    fmtMillions,
    fmtNumber,
    fmtPercent,
    fmtPrice,
    fmtQuantity,
    fmtThousands,
    NumberFormatOptions,
    QuantityFormatOptions
} from './FormatNumber';
import {createRenderer, type TextRenderer} from './FormatUtils';
import {DEFAULT_COLOR_SPEC, ROUNDED_ZERO} from './impl/Utils';

/**
 * Renderer factories over {@link fmtNumber} and friends, for `Column.renderer`. Each takes the
 * options of its format function and returns a function of the value alone.
 */
export const numberRenderer = createRenderer(fmtNumber),
    thousandsRenderer = createRenderer(fmtThousands),
    millionsRenderer = createRenderer(fmtMillions),
    billionsRenderer = createRenderer(fmtBillions),
    quantityRenderer = createRenderer(fmtQuantity),
    priceRenderer = createRenderer(fmtPrice),
    percentRenderer = createRenderer(fmtPercent);

/**
 * Text-returning counterparts of {@link numberRenderer} and friends, for `Column.textRenderer`.
 *
 * ag-Grid writes their output into the cell as text. With `colorSpec`, or `ledger` with
 * `forceLedgerAlign` (the default), the text renderer carries `cellClassRules` that
 * color the cell by sign and reserve the width of a closing parenthesis on positives.
 */
export const numberTextRenderer = createNumberTextRenderer(fmtNumber),
    thousandsTextRenderer = createNumberTextRenderer(fmtThousands),
    millionsTextRenderer = createNumberTextRenderer(fmtMillions),
    billionsTextRenderer = createNumberTextRenderer(fmtBillions),
    quantityTextRenderer = createNumberTextRenderer(fmtQuantity, {ledger: true}),
    priceTextRenderer = createNumberTextRenderer(fmtPrice),
    percentTextRenderer = createNumberTextRenderer(fmtPercent);

/**
 * Options of {@link numberTextRenderer} and friends: those of the format function, less the
 * options that need markup, which are typed `never`. `colorSpec` and ledger alignment style the
 * cell through `cellClassRules` instead.
 */
export type NumberTextRendererOptions<O extends NumberFormatOptions = NumberFormatOptions> = Omit<
    O,
    | 'colorSpec'
    | 'tooltip'
    | 'withSignGlyph'
    | 'labelCls'
    | 'nullDisplay'
    | 'zeroDisplay'
    | 'asHtml'
    | 'originalValue'
> & {
    /**
     * True to color the cell by sign with the default classes (`xh-pos-val`, `xh-neg-val`,
     * `xh-neutral-val`), or the CSS class to apply per sign. Class names only - a `colorSpec`
     * with style objects needs `numberRenderer`.
     */
    colorSpec?: boolean | ColorClassSpec;

    /** Display value for null and other invalid input. */
    nullDisplay?: string;

    /** Display value for zero. */
    zeroDisplay?: string;

    /** Not supported - set `Column.tooltip` instead. */
    tooltip?: never;

    /** Not supported - the glyph needs markup. Use `numberRenderer`. */
    withSignGlyph?: never;

    /** Not supported - a text renderer appends its `label` as plain text. */
    labelCls?: never;

    /** Not supported - a text renderer always returns plain text. */
    asHtml?: never;
};

/** Options of {@link quantityTextRenderer}. */
export type QuantityTextRendererOptions = NumberTextRendererOptions<QuantityFormatOptions>;

//---------------
// Implementation
//---------------
function createNumberTextRenderer<O extends NumberFormatOptions>(
    fmt: (v: number, opts?: O) => ReactNode,
    fmtDefaults: {ledger?: boolean} = {}
): (opts?: NumberTextRendererOptions<O>) => TextRenderer<number> {
    return opts => {
        const {
                colorSpec = false,
                ledger = fmtDefaults.ledger ?? false,
                forceLedgerAlign = true,
                ...rest
            } = opts ?? ({} as NumberTextRendererOptions<O>),
            {strictZero = true, zeroDisplay = null} = rest,
            // Color and ledger alignment come from the cell class rules below, so `fmtNumber`
            // returns plain text.
            fmtOpts: NumberFormatOptions = {
                ...rest,
                ledger,
                forceLedgerAlign: false,
                colorSpec: false,
                labelCls: null
            },
            // Just the digits, for the `strictZero` test that `fmtNumber` applies.
            digitsOpts: NumberFormatOptions = {
                ...fmtOpts,
                ledger: false,
                withPlusSign: false,
                prefix: null,
                label: null,
                zeroDisplay: null,
                strictZero: true
            },
            ret: TextRenderer<number> = v => fmt(v, fmtOpts as O) as string,
            rules: TextRenderer['cellClassRules'] = {};

        // True if `strictZero: false` shows the value as zero. Memoized on the last value, as
        // AG Grid tests a cell's rules one after another with the same value.
        let lastTested: any, lastRoundsToZero: boolean;
        const roundsToZero = (v: any): boolean => {
            if (!Object.is(v, lastTested)) {
                lastTested = v;
                const digits = (fmt(v, digitsOpts as O) as string).replace('-', '');
                lastRoundsToZero = ROUNDED_ZERO.test(digits);
            }
            return lastRoundsToZero;
        };

        // The value as `fmtNumber` styles it: zero if `strictZero: false` rounds it to zero, null
        // if `nullDisplay` or `zeroDisplay` shows instead. Other values (numeric strings, NaN,
        // Infinity) get ledger alignment but no sign color, as from `numberRenderer`.
        const styledValue = (v: any): any => {
            if (v == null || v === '') return null;
            if (!strictZero && v !== 0 && roundsToZero(v)) v = 0;
            return v === 0 && zeroDisplay != null ? null : v;
        };

        if (colorSpec) {
            const spec = colorSpec === true ? DEFAULT_COLOR_SPEC : colorSpec,
                signTests = {pos: v => v > 0, neg: v => v < 0, neutral: v => v === 0},
                // One rule per class, so that signs sharing a class each apply it.
                testsByCls: Record<string, Array<(v: number) => boolean>> = {};
            forEach(signTests, (test, key) => {
                const cls = spec[key];
                throwIf(
                    !isNil(cls) && !isString(cls),
                    "Text renderer option 'colorSpec' takes class names only - use a renderer for styles."
                );
                if (cls) (testsByCls[cls] ??= []).push(test);
            });
            forEach(testsByCls, (tests, cls) => {
                rules[cls] = ({value}) => {
                    const v = styledValue(value);
                    return isFinite(v) && tests.some(test => test(v));
                };
            });
        }

        if (ledger && forceLedgerAlign) {
            // Values shown without parentheses reserve the width of a closing one.
            rules['xh-cell--ledger-align'] = ({value}) => {
                const v = styledValue(value);
                return v != null && !(v < 0);
            };
        }

        if (!isEmpty(rules)) ret.cellClassRules = rules;
        return ret;
    };
}
