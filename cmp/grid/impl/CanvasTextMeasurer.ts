/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Measures text widths in the grid cell font with a hidden canvas. Used by `ColumnWidthCalculator`
 * to rank the values of a column before it measures the widest few in the DOM.
 *
 * `estimateWidth()` sums per-character widths, each measured once and cached, so a pass over many
 * values costs one `measureText` call per distinct character rather than per value. The sum
 * ignores kerning, ligatures and contextual alternates, so it can differ from the exact width of
 * `measureWidth()` by a fraction of a pixel per kerned pair, or by up to ~2px for a glyph a font
 * swaps in context (Inter's `*` after a digit or capital).
 *
 * @internal
 */
export class CanvasTextMeasurer {
    private readonly fontEl: HTMLElement;
    private readonly charWidths = new Map<string, number>();
    private _context: CanvasRenderingContext2D;

    /** @param fontEl - element whose computed font-size and font-family the canvas measures in. */
    constructor(fontEl: HTMLElement) {
        this.fontEl = fontEl;
    }

    /** Approximate pixel width of text, as the sum of its cached per-character widths. */
    estimateWidth(text: string): number {
        let ret = 0;
        // Iterates code points, so a surrogate pair is measured as one character.
        for (const ch of text) ret += this.getCharWidth(ch);
        return ret;
    }

    /** Exact pixel width of text, as rendered by the canvas. */
    measureWidth(text: string): number {
        return this.context.measureText(text).width;
    }

    //------------------
    // Implementation
    //------------------
    private getCharWidth(ch: string): number {
        const {charWidths} = this;
        let ret = charWidths.get(ch);
        if (ret == null) {
            ret = this.measureWidth(ch);
            charWidths.set(ch, ret);
        }
        return ret;
    }

    private get context(): CanvasRenderingContext2D {
        if (!this._context) {
            const canvasEl = document.createElement('canvas');
            canvasEl.classList.add('xh-grid-autosize-canvas');
            document.body.appendChild(canvasEl);

            const context = canvasEl.getContext('2d'),
                style = window.getComputedStyle(this.fontEl),
                fontSize = style.getPropertyValue('font-size'),
                fontFamily = style.getPropertyValue('font-family');

            context.font = `${fontSize} ${fontFamily}`;
            this._context = context;
        }
        return this._context;
    }
}
