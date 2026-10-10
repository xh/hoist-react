/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {stripTags} from '@xh/hoist/utils/js';
import {range} from 'lodash';
import {createElement} from 'react';
import {afterEach, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import {ColumnWidthCalculator} from './ColumnWidthCalculator';

/**
 * How grid autosizing picks the values it measures. The calculator estimates every value from
 * cached per-character widths, re-ranks the RANK_SAMPLES widest estimates with an exact canvas
 * measurement, and measures only the top few of those in the DOM. A column is sized wrong if its
 * widest value falls out of that sample, and autosizing a large grid is slow if the estimate costs
 * a canvas call per row or the re-rank measures more values than it must.
 */
describe('ColumnWidthCalculator', () => {
    beforeAll(() => initTestAppAsync());

    // jsdom has no canvas and no layout. Every test stubs both - see createCalculator().
    afterEach(() => vi.restoreAllMocks());

    describe('calcWidthAsync', () => {
        it('sizes to the widest value when over-estimated values outrank it by estimate', async () => {
            // The fillers estimate wider than the target but measure narrower, from the kerning the
            // estimate misses. The exact re-rank must bring the target into the DOM sample.
            const {target, calc, bufferPx, gridModel} = createOverestimatedColumn();

            await expect(calcWidthAsync(calc, gridModel)).resolves.toBe(measure(target) + bufferPx);
            expect(calc.getCellWidth).toHaveBeenCalledWith(target, undefined);
            expect(calc.getCellWidth).toHaveBeenCalledTimes(calc.SIZE_CALC_SAMPLES);
        });

        it('measures every value exactly in a column of up to RANK_SAMPLES distinct values', async () => {
            const {target, fillers, calc, ctx, gridModel} = createOverestimatedColumn();

            await calcWidthAsync(calc, gridModel);
            const measured = exactMeasurements(ctx);
            expect(fillers.length + 1).toBeLessThanOrEqual(calc.RANK_SAMPLES);
            expect(measured).toHaveLength(fillers.length + 1);
            expect(measured).toContain(target);
        });

        it('measures exactly only the RANK_SAMPLES widest estimates of a larger column', async () => {
            // Canvas calls then scale with distinct characters and RANK_SAMPLES, not with rows.
            const values = range(600).map(n => `${n}`.padStart(4, '0')),
                {calc, ctx, gridModel} = createCalculator(values),
                distinctChars = new Set(values.join('')).size;

            await calcWidthAsync(calc, gridModel);
            expect(exactMeasurements(ctx)).toHaveLength(calc.RANK_SAMPLES);
            expect(ctx.measureText.mock.calls.length).toBeLessThanOrEqual(
                distinctChars + calc.RANK_SAMPLES
            );
        });

        it('adds the tree indentation of each depth to the values at that depth', async () => {
            const {calc, bufferPx, gridModel} = createCalculator(
                [{name: 'aaaa', children: [{name: 'aaa', children: [{name: 'aa'}]}]}],
                {treeMode: true, columns: [{field: 'name', isTreeColumn: true}]}
            );
            calc.getCellEl().style.left = '20px';

            // The shortest text is the deepest, so it is the widest cell: 20px + 3 levels * 20px.
            await expect(calcWidthAsync(calc, gridModel)).resolves.toBe(
                measure('aa') + 60 + bufferPx
            );
        });

        it('treats nil values as empty, without measuring them', async () => {
            const {calc, ctx, bufferPx, gridModel} = createCalculator([null, undefined, 'ab']);

            await expect(calcWidthAsync(calc, gridModel)).resolves.toBe(measure('ab') + bufferPx);
            const measured = ctx.measureText.mock.calls.map(it => it[0]);
            expect(measured).not.toContain('null');
            expect(measured).not.toContain('undefined');
        });

        it('estimates an element renderer from its markup with the tags stripped', async () => {
            const {calc, ctx, bufferPx, gridModel} = createCalculator([12], {
                columns: [{field: 'name', renderer: v => createElement('b', null, `${v}%`)}]
            });

            await expect(calcWidthAsync(calc, gridModel)).resolves.toBe(measure('12%') + bufferPx);
            const measured = ctx.measureText.mock.calls.map(it => it[0]);
            expect(measured).toContain('12%');
            expect(measured.join('')).not.toContain('<');
        });
    });
});

//------------------
// Helpers
//------------------
const charWidth = 10,
    kerning = {AV: -5};

/** Width of text in the fake font: 10px per character, plus kerning for the pairs above. */
function measure(text: string): number {
    let width = 0,
        prev = '';
    for (const ch of text) {
        width += charWidth + (kerning[prev + ch] ?? 0);
        prev = ch;
    }
    return width;
}

/** The per-character estimate of text in the fake font, which ignores kerning. */
function estimate(text: string): number {
    return text.length * charWidth;
}

/** Texts measured exactly on the canvas, as opposed to the single characters of the estimate. */
function exactMeasurements(ctx: {measureText: ReturnType<typeof vi.fn>}): string[] {
    return ctx.measureText.mock.calls.map(it => it[0]).filter(it => it.length > 1);
}

/**
 * A column of 120 distinct values that estimate wider than its widest value, since the kerning in
 * each contracts it below the target. The target ranks 121st by estimate, well outside the
 * SIZE_CALC_SAMPLES the DOM pass measures, so only the exact re-rank can surface it.
 */
function createOverestimatedColumn() {
    const target = 'W'.repeat(14),
        fillers = range(100, 220).map(n => 'AV'.repeat(6) + n),
        ret = createCalculator([...fillers, target]);

    fillers.forEach(filler => {
        expect(estimate(filler)).toBeGreaterThan(estimate(target));
        expect(measure(filler)).toBeLessThan(measure(target));
    });
    return {target, fillers, ...ret};
}

function createCalculator(values: any[], config: GridConfig = {}) {
    const ctx = {font: '', measureText: vi.fn((text: string) => ({width: measure(text)}))};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as any);

    const calc = new ColumnWidthCalculator();
    // The hidden cell has no layout in jsdom, so size it from its text as a browser would.
    vi.spyOn(calc, 'getCellWidth').mockImplementation(value =>
        value == null ? 0 : measure(stripTags(String(value)))
    );

    const gridModel = new GridModel({columns: [{field: 'name'}], ...config}),
        data = values.map((it, id) => (isRow(it) ? withIds(it, `${id}`) : {id, name: it}));
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData(data);

    return {calc, ctx, gridModel, bufferPx: gridModel.autosizeOptions.bufferPx};
}

function calcWidthAsync(calc: ColumnWidthCalculator, gridModel: GridModel): Promise<number> {
    const {store, autosizeOptions} = gridModel;
    return calc.calcWidthAsync(gridModel, store.records, 'name', autosizeOptions);
}

function isRow(value: any): value is PlainObject {
    return value != null && typeof value === 'object';
}

/** Give a tree row and its descendants ids from their path. */
function withIds(row: PlainObject, id: string): PlainObject {
    const children = row.children?.map((it, idx) => withIds(it, `${id}.${idx}`));
    return {...row, id, children};
}
