/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {describe, expect, it} from 'vitest';
import {scrollTopToReveal, visibleRowRange} from './IconGridWindow';

/**
 * The IconPicker grid renders only the rows these helpers select, so a wrong range shows blank
 * rows, and a wrong scroll target leaves the keyboard-highlighted icon out of view.
 */
describe('visibleRowRange', () => {
    // 260px viewport over 32px rows shows parts of ceil(260 / 32) + 1 = 10 rows.
    const base = {viewportHeight: 260, rowHeight: 32, rowCount: 1000, overscan: 4};

    it('starts at the first row when scrolled to the top', () => {
        expect(visibleRowRange({...base, scrollRow: 0})).toEqual([0, 14]);
    });

    it('adds overscan rows on both sides when scrolled to the middle', () => {
        expect(visibleRowRange({...base, scrollRow: 500})).toEqual([496, 514]);
    });

    it('stops at the last row when scrolled to the end', () => {
        expect(visibleRowRange({...base, scrollRow: 992})).toEqual([988, 1000]);
    });

    it('renders every row when they all fit', () => {
        expect(visibleRowRange({...base, scrollRow: 0, rowCount: 5})).toEqual([0, 5]);
    });

    it('clamps a scroll position beyond the last row', () => {
        expect(visibleRowRange({...base, scrollRow: 5000})).toEqual([1000, 1000]);
    });

    it('returns an empty range for no rows', () => {
        expect(visibleRowRange({...base, scrollRow: 0, rowCount: 0})).toEqual([0, 0]);
        expect(visibleRowRange({...base, scrollRow: 3, rowCount: 0})).toEqual([0, 0]);
    });

    it('defaults to four overscan rows', () => {
        const {overscan, ...noOverscan} = base;
        expect(visibleRowRange({...noOverscan, scrollRow: 500})).toEqual([496, 514]);
    });
});

describe('scrollTopToReveal', () => {
    // 8 columns of 30px cells in 32px rows, inside 4px of padding.
    const base = {columns: 8, rowHeight: 32, cellSize: 30, padTop: 4, clientHeight: 260};

    it('returns null for a cell already in view', () => {
        expect(scrollTopToReveal({...base, idx: 0, scrollTop: 0})).toBeNull();
        expect(scrollTopToReveal({...base, idx: 6 * 8 + 3, scrollTop: 0})).toBeNull();
        expect(scrollTopToReveal({...base, idx: 20 * 8, scrollTop: 640})).toBeNull();
    });

    it('scrolls up to the top of a row above the viewport', () => {
        // Row 10 starts at 320px.
        expect(scrollTopToReveal({...base, idx: 10 * 8 + 5, scrollTop: 400})).toBe(320);
    });

    it('scrolls up to a row cut off at the top of the viewport', () => {
        expect(scrollTopToReveal({...base, idx: 10 * 8, scrollTop: 330})).toBe(320);
    });

    it('scrolls down so a row below the viewport sits at its bottom edge', () => {
        // Row 20: 4 pad + 640 top + 30 cell + 4 pad = 678, less the 260px viewport.
        expect(scrollTopToReveal({...base, idx: 20 * 8 + 1, scrollTop: 0})).toBe(418);
    });

    it('scrolls down to a row cut off at the bottom of the viewport', () => {
        // Row 8 ends at 4 + 256 + 30 + 4 = 294px, past the 260px viewport.
        expect(scrollTopToReveal({...base, idx: 8 * 8, scrollTop: 0})).toBe(34);
    });
});
