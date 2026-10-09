/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Row windowing math for the `IconPicker` grid. The grid renders only the rows in and near view,
 * with padding standing in for the rows above and below, so it stays fast with thousands of icons.
 * @internal
 */

/** Size in px of one icon cell. */
export const CELL_SIZE = 30;

/** Size in px of one icon cell in compact mode. */
export const COMPACT_CELL_SIZE = 24;

/** Gap in px between cells, both across and down. */
export const CELL_GAP = 2;

/** Rows rendered beyond each edge of the viewport, so fast scrolling does not show blank rows. */
export const OVERSCAN_ROWS = 4;

/** Rows `[start, end)` to render for a scroll position. */
export function visibleRowRange({
    scrollRow,
    viewportHeight,
    rowHeight,
    rowCount,
    overscan = OVERSCAN_ROWS
}: {
    /** Index of the first row at or above the top of the viewport. */
    scrollRow: number;
    viewportHeight: number;
    /** Height in px of one row, including the gap below it. */
    rowHeight: number;
    rowCount: number;
    overscan?: number;
}): [number, number] {
    const visible = Math.ceil(viewportHeight / rowHeight) + 1,
        start = Math.min(Math.max(0, scrollRow - overscan), rowCount),
        end = Math.min(rowCount, Math.max(0, scrollRow) + visible + overscan);
    return [start, Math.max(start, end)];
}

/**
 * The `scrollTop` that brings the cell at `idx` fully into view, with the grid's padding around it,
 * or null if it is already in view.
 */
export function scrollTopToReveal({
    idx,
    columns,
    rowHeight,
    cellSize,
    padTop,
    scrollTop,
    clientHeight
}: {
    idx: number;
    columns: number;
    /** Height in px of one row, including the gap below it. */
    rowHeight: number;
    cellSize: number;
    /** Padding in px of the scrolling element, above its first row and below its last. */
    padTop: number;
    scrollTop: number;
    clientHeight: number;
}): number {
    const rowTop = Math.floor(idx / columns) * rowHeight,
        bottom = padTop + rowTop + cellSize + padTop;

    if (rowTop < scrollTop) return rowTop;
    if (bottom > scrollTop + clientHeight) return bottom - clientHeight;
    return null;
}
