/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnGroupSpec, ColumnSpec} from '@xh/hoist/cmp/grid';
import type {CubeField, PivotPath} from '@xh/hoist/data';

/**
 * Display sort for the pivot values at one level of the path tree.
 *
 * `'asc'` / `'desc'` sort by raw dimension value. An array is an explicit ordering of raw dimension
 * values, with anything unlisted following in the view's own ascending order. `null` leaves the level
 * in that view order.
 */
export type PivotSort = 'asc' | 'desc' | any[];

/**
 * {@link ColumnSpec} keys managed by {@link CubeGridModel} and stripped from any
 * {@link CubeGridConfig.pivotColumns} entry - column identity and the export header are derived
 * from the pivot path, and the rest are reserved for this model's own use.
 */
export const RESERVED_PIVOT_COLUMN_KEYS = [
    'colId',
    'isTreeColumn',
    'hidden',
    'hideable',
    'filterable',
    'excludeFromChooser',
    'exportName',
    'enableDotSeparatedFieldPath',
    'omit',
    'pinned',
    'editable',
    'editor',
    'setValueFn',
    'getValueFn',
    'sortValue',
    'agOptions'
] as const;

/**
 * Config for the pivot columns of one measure, with `field` naming the value field.
 * {@link RESERVED_PIVOT_COLUMN_KEYS} are an error to write inline, but a spec shared with the
 * fixed columns and carrying them assigns cleanly and they are stripped.
 */
export type PivotColumnSpec = Omit<ColumnSpec, (typeof RESERVED_PIVOT_COLUMN_KEYS)[number]>;

/**
 * Which pivot column is being built - the argument to {@link CubeGridConfig.pivotColumnSpecFn}.
 * `cell` sits under a leaf path, `total` in a `Total` group. Summaries take the root path for the
 * row summaries. `spec` is the measure's `pivotColumns` entry the overrides merge over, so an app
 * can derive from it.
 */
export interface PivotColumnContext {
    path: PivotPath;
    field: CubeField;
    kind: 'cell' | 'total';
    spec: PivotColumnSpec;
}

/** Keys of a pivot column group that identify or structure it - stripped from app overrides. */
export const RESERVED_PIVOT_COLUMN_GROUP_KEYS = [
    'groupId',
    'children',
    'groupShowMode',
    'collapsed',
    'omit',
    'chooserName',
    'agOptions'
] as const;

/** Overrides for a pivot column group - see {@link CubeGridConfig.pivotColumnGroupSpecFn}. */
export type PivotColumnGroupSpec = Omit<
    ColumnGroupSpec,
    (typeof RESERVED_PIVOT_COLUMN_GROUP_KEYS)[number]
>;

/**
 * Which pivot column group is being built - the argument to
 * {@link CubeGridConfig.pivotColumnGroupSpecFn}. `path` is the group for a pivot path, with the root
 * path for the group over the whole region. `total` holds a path's summary columns. `spec` is
 * the group as built - header name, alignment and tooltip - which the overrides merge over.
 */
export interface PivotColumnGroupContext {
    path: PivotPath;
    kind: 'path' | 'total';
    spec: PivotColumnGroupSpec;
}
