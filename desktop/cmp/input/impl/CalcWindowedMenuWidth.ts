/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {logWarn, stripTags} from '@xh/hoist/utils/js';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {isEmpty, isNil, isString, sortBy, takeRight} from 'lodash';
import {isValidElement, ReactNode} from 'react';

/** Max number of (widest) options to render and measure when sizing a windowed menu. */
const SIZE_CALC_SAMPLES = 25;
/** Allowance for the vertical scrollbar present in windowed (virtualized) menus. */
const SCROLLBAR_PX = 20;

/**
 * Compute an explicit pixel width for a windowed (virtualized) `Select` menu.
 *
 * Windowed menus can't auto-size via CSS - react-window absolutely-positions rows at width:100%,
 * so option content never widens the menu and it collapses to the control width. This restores
 * content-based sizing using Canvas + off-screen DOM, the same render-and-measure approach as the
 * grid's `ColumnWidthCalculator`: render each option's actual menu markup (via the configured
 * `optionRenderer`, if any), canvas-estimate its width to pick the widest candidates, then measure
 * only those candidates' displayed width in a hidden probe - so custom `optionRenderer`s (icons,
 * multi-element content, etc.) size correctly. Unlike the grid (which may autosize many columns
 * over thousands of records), this renders one menu's options once per options change.
 *
 * @param options - normalized (possibly grouped) Select options.
 * @param renderOption - renders an option to its menu `ReactNode` (e.g. model.formatOptionLabel).
 * @param portal - shared menu portal div, used to host probes so menu CSS (font, padding) applies.
 * @returns explicit menu width in px, or null to fall back to the control width.
 * @internal
 */
export function calcWindowedMenuWidth(
    options: any[],
    renderOption: (opt: any) => ReactNode,
    portal: HTMLElement
): number {
    const flatOpts = [],
        collect = opts => opts.forEach(o => (o.options ? collect(o.options) : flatOpts.push(o)));
    collect(options);
    if (isEmpty(flatOpts)) return null;

    // Render a hidden probe (menu > option) into the portal, so menu CSS (font, padding) applies
    // via its location under document.body.xh-app.
    const menu = document.createElement('div'),
        option = document.createElement('div');
    menu.className = 'xh-select__menu';
    menu.style.cssText = 'position:absolute; visibility:hidden; height:0; overflow:hidden';
    option.className = 'xh-select__option';
    option.style.cssText = 'width:max-content; white-space:nowrap';
    menu.appendChild(option);
    portal.appendChild(menu);

    try {
        // 1) Render each option's menu markup and canvas-estimate its width (tags stripped).
        const ctx = getCanvasContext(option),
            estimates = flatOpts.map(o => {
                const node = renderOption(o),
                    markup = isValidElement(node)
                        ? renderToStaticMarkup(node)
                        : isNil(node)
                          ? ''
                          : String(node);
                return {markup, width: getStringWidth(ctx, stripTags(markup))};
            });

        // 2) Measure only the widest sample's displayed width in the hidden probe.
        const sample = takeRight(sortBy(estimates, 'width'), SIZE_CALC_SAMPLES);
        let ret = 0;
        sample.forEach(({markup}) => {
            option.innerHTML = markup;
            ret = Math.max(ret, Math.ceil(option.clientWidth));
        });

        // Option padding is already measured; pad only for the windowed scrollbar.
        return ret ? ret + SCROLLBAR_PX : null;
    } catch (e) {
        // E.g. an optionRenderer that can't be statically rendered - fall back to control width.
        logWarn(['Error calculating windowed menu width.', e], 'Select');
        return null;
    } finally {
        portal.removeChild(menu);
    }
}

//------------------
// Canvas-based width estimation - mirrors grid's ColumnWidthCalculator.
//------------------
let _canvas: HTMLCanvasElement;
function getCanvasContext(measureEl: HTMLElement): CanvasRenderingContext2D {
    if (!_canvas) _canvas = document.createElement('canvas');

    const ctx = _canvas.getContext('2d'),
        style = window.getComputedStyle(measureEl),
        fontSize = style.getPropertyValue('font-size'),
        fontFamily = style.getPropertyValue('font-family');

    ctx.font = `${fontSize} ${fontFamily}`;
    return ctx;
}

function getStringWidth(ctx: CanvasRenderingContext2D, string: any): number {
    return isString(string) ? ctx.measureText(string).width : 0;
}
