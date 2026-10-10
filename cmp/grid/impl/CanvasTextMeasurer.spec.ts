/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {CanvasTextMeasurer} from './CanvasTextMeasurer';

/**
 * The canvas text measurements behind grid autosizing. The estimate must sum per-character widths
 * and cache them, or a pass over a large grid costs one canvas call per value again. The exact
 * measurement must reflect the kerning the estimate ignores, or the re-rank it feeds does nothing.
 */
describe('CanvasTextMeasurer', () => {
    // jsdom has no canvas - getContext() returns null. Every test stubs it with a fake.
    afterEach(() => vi.restoreAllMocks());

    describe('estimateWidth', () => {
        it("sums the widths of the text's characters", () => {
            const {measurer} = createMeasurer();
            expect(measurer.estimateWidth('AB')).toBe(widths.A + widths.B);
            expect(measurer.estimateWidth('A B')).toBe(widths.A + widths[' '] + widths.B);
        });

        it('ignores kerning between characters', () => {
            const {measurer} = createMeasurer();
            expect(measurer.estimateWidth('AV')).toBe(widths.A + widths.V);
        });

        it('measures each character once and reuses its width', () => {
            const {measurer, ctx} = createMeasurer();

            measurer.estimateWidth('AAAA');
            expect(ctx.measureText).toHaveBeenCalledTimes(1);
            expect(ctx.measureText).toHaveBeenCalledWith('A');

            measurer.estimateWidth('ABA');
            expect(ctx.measureText).toHaveBeenCalledTimes(2);
            expect(ctx.measureText).toHaveBeenLastCalledWith('B');
        });

        it('measures a surrogate pair as one character', () => {
            const {measurer, ctx} = createMeasurer();

            expect(measurer.estimateWidth('😀😀')).toBe(widths['😀'] * 2);
            expect(ctx.measureText).toHaveBeenCalledTimes(1);
            expect(ctx.measureText).toHaveBeenCalledWith('😀');
        });

        it('is 0 for an empty string, with no measurement', () => {
            const {measurer, ctx} = createMeasurer();
            expect(measurer.estimateWidth('')).toBe(0);
            expect(ctx.measureText).not.toHaveBeenCalled();
        });
    });

    describe('measureWidth', () => {
        it('measures the whole text exactly, including kerning', () => {
            const {measurer} = createMeasurer();
            expect(measurer.measureWidth('AV')).toBe(widths.A + widths.V + kerning.AV);
            expect(measurer.measureWidth('')).toBe(0);
        });
    });

    it("measures in the font element's computed font", () => {
        const {ctx} = createMeasurer({fontSize: '13px', fontFamily: 'Inter'});
        expect(ctx.font).toBe('13px Inter');
    });
});

//------------------
// Helpers
//------------------
const widths = {A: 10, B: 12, V: 10, ' ': 4, '😀': 20, other: 8},
    kerning = {AV: -3};

/** A fake 2d context that measures text from a per-character table plus a kerning adjustment. */
function createFakeContext() {
    return {
        font: '',
        measureText: vi.fn((text: string) => {
            let width = 0,
                prev = '';
            for (const ch of text) {
                width += widths[ch] ?? widths.other;
                width += kerning[prev + ch] ?? 0;
                prev = ch;
            }
            return {width};
        })
    };
}

function createMeasurer(font: {fontSize?: string; fontFamily?: string} = {}) {
    const ctx = createFakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as any);

    const fontEl = document.createElement('div');
    Object.assign(fontEl.style, font);
    const measurer = new CanvasTextMeasurer(fontEl);

    // Create the context now, so a test can assert on its font before measuring.
    measurer.measureWidth('');
    ctx.measureText.mockClear();
    return {measurer, ctx};
}
