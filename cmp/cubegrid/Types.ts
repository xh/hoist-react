/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnSpec} from '@xh/hoist/cmp/grid';
import type {HSide} from '@xh/hoist/core';
import type {PivotPath} from '@xh/hoist/data';

/**
 * Display sort for the values of one pivot dimension.
 *
 * `'asc'` / `'desc'` sort by raw dimension value. An array is an explicit ordering of raw dimension
 * values, with anything unlisted following in the view's own ascending order. A comparator orders
 * the paths, as `Array.sort` does - it runs on each rebuild, so set new `dimensions` to re-sort
 * when what it reads changes. `null` leaves the dimension in that view order.
 */
export type PivotSort = 'asc' | 'desc' | any[] | ((a: PivotPath, b: PivotPath) => number);

/**
 * Display settings for one pivot dimension - see {@link CubeGridPivotConfig.dimensions}.
 *
 * A dimension's summary aggregates its values: the first dimension's is the row summary, which
 * the region collapses to, and each later dimension's is the summary its parent groups collapse to.
 */
export interface PivotDimensionSpec {
    /** Name of the pivot dimension. */
    field: string;

    /** Display order of the dimension's values. Default null, keeping view order. */
    sortBy?: PivotSort;

    /**
     * True (default) to let groups collapse to this dimension's summary. False to fix them open,
     * with the summary shown only where `showSummary` asks for it.
     */
    collapsible?: boolean;

    /**
     * Show this dimension's summary while its groups are expanded too, as
     * {@link GridConfig.showSummary} is the summary row. True for the default 'left', where the
     * summary keeps its collapsed position and the group opens to its right, or an {@link HSide}
     * to place it within the group. Default false - a collapsed group always shows it.
     */
    showSummary?: boolean | HSide;

    /** Header of this dimension's summary, and its name in export headers. Default 'Total'. */
    summaryLabel?: string;

    /**
     * True (default) to show `summaryLabel` over the summary while its group is collapsed. False
     * to drop it, so the summary's column headers stretch up to the group's. No effect with
     * `measuresOutermost`, where a summary is one column headed by its label.
     */
    showCollapsedLabel?: boolean;

    /**
     * Class for this dimension's summary columns, cells and headers, over the built-in
     * `xh-cube-grid__summary-cell` and `xh-cube-grid__summary-header` classes every summary
     * carries - to style the row summary apart from the others, say.
     */
    summaryClass?: string;

    /**
     * Header text for one of the dimension's values - a date as 'Nov 2026', say. Also used in
     * export headers and to fit widths. Not called for an empty value, which takes `emptyLabel`.
     * Default the value as a string.
     */
    valueRenderer?: (value: any, path: PivotPath) => string;

    /**
     * Class for each of the dimension's values, on its header and on every header and cell
     * beneath it - nested values and their summaries included. A function picks it per value,
     * with `value` null for an empty one, to set one apart, such as the current month.
     */
    valueClass?: string | ((value: any, path: PivotPath) => string);

    /** Header text for a null / blank value of the dimension. Default '(empty)'. */
    emptyLabel?: string;
}

/** Settings for one pivot measure - see {@link CubeGridPivotConfig.measures}. */
export interface PivotMeasureSpec {
    /** Name of the measure, a `pivot.measures` entry. */
    field: string;

    /**
     * Column config applied to every pivot column built for the measure, under every path -
     * renderer, width, align, and so on. Its `headerName` names the measure. Keys the grid sets
     * itself - identity, placement, visibility, export name, editing and `agOptions` - are
     * ignored, so a spec shared with the fixed `columns` applies cleanly.
     */
    column?: Partial<ColumnSpec>;
}

/** Options for {@link CubeGridPivotConfig.linkedSizing}. */
export interface PivotLinkedSizingOptions {
    /**
     * Most a pivot label can claim to fit, in pixels across the columns it spans - a group's, or
     * with `measuresOutermost` a column's own header. Default 140. Data can widen the columns past
     * it. 0 to size for data alone.
     */
    headerFitMaxWidth?: number;
}
