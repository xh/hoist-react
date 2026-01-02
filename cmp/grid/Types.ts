/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {GridFilterFieldSpecConfig} from '@xh/hoist/cmp/grid/filter/GridFilterFieldSpec';
import {HSide, PersistOptions, Some} from '@xh/hoist/core';
import {Store, StoreRecord, View} from '@xh/hoist/data';
import {ReactElement, ReactNode} from 'react';
import {Column} from './columns/Column';
import {ColumnGroup} from './columns/ColumnGroup';
import {GridModel} from './GridModel';

import type {
    CellClassParams,
    HeaderClassParams,
    HeaderValueGetterParams,
    ICellRendererParams,
    IRowNode,
    ITooltipParams,
    RowClassParams,
    ValueSetterParams,
    CustomCellEditorProps
} from '@xh/hoist/kit/ag-grid';

export interface ColumnState {
    colId: string;
    width: number;
    hidden: boolean;

    /** has this column been resized manually? */
    manuallySized?: boolean;
    /** Side if pinned, null if not. */
    pinned?: HSide;
}

/**
 * Comparator for custom grid group sorting, provided to GridModel.
 * @param groupAVal - first group value to be compared.
 * @param groupBVal - second group value to be compared.
 * @param groupField - field name being grouped at this level.
 * @param metadata - additional metadata with raw ag-Grid group nodes.
 * @returns 0 if group values are equal, a negative number if `a` sorts first,
 *      and a positive number if `b` sorts first.
 */
export type GridGroupSortFn = (
    groupAVal: string,
    groupBVal: string,
    groupField: string,
    metadata: {
        gridModel: GridModel;
        nodeA: IRowNode;
        nodeB: IRowNode;
    }
) => number;

/**
 * Closure to generate CSS class names for a row.
 * @param record - the StoreRecord associated with the rendered row.
 * @returns CSS class(es) to apply to the row level.
 */
export type RowClassFn = (record: StoreRecord) => Some<string>;

/**
 * Function to determine if a particular CSS class should be added/removed from a row,
 * via rowClassRules config.
 * @param agParams - as provided by AG-Grid.  Note that when a RowClassRuleFn is called by the
 *      GridAutosizeService, it is only provided with an object with the 'data' key,
 *      not the entire RowClassParams params.
 * @returns true if the class to which this function is keyed should be added, false if
 *      it should be removed.
 */
export type RowClassRuleFn = (agParams: RowClassParams) => boolean;

export interface GridModelPersistOptions extends PersistOptions {
    /** True (default) to include column state or provide column-specific PersistOptions. */
    persistColumns?: boolean | PersistOptions;
    /** True (default) to include grouping state or provide grouping-specific PersistOptions. */
    persistGrouping?: boolean | PersistOptions;
    /** True (default) to include sort state or provide sort-specific PersistOptions. */
    persistSort?: boolean | PersistOptions;
    /** True (default) to include expanded level state or provide expanded level-specific PersistOptions.  */
    persistExpandToLevel?: boolean | PersistOptions;
}

export interface GridFilterModelConfig {
    /**
     * Store / Cube View to be filtered as column filters are applied. Defaulted to the
     * gridModel's store.
     */
    bind?: Store | View;

    /**
     * True to update filters immediately after each change made in the column-based filter UI.
     * Defaults to False.
     */
    commitOnChange?: boolean;

    /**
     * Specifies the fields this model supports for filtering. Should be configs for
     * {@link GridFilterFieldSpec}, string names to match with Fields in bound Store/View, or omitted
     * entirely to indicate that all fields should be filter-enabled.
     */
    fieldSpecs?: Array<string | GridFilterFieldSpecConfig>;

    /** Default properties to be assigned to all fieldSpecs created by this model. */
    fieldSpecDefaults?: Omit<GridFilterFieldSpecConfig, 'field'>;
}

/**
 * Renderer for a group row
 * @param context - The group renderer params from ag-Grid
 * @returns the formatted value for display.
 */
export type GroupRowRenderer = (context: ICellRendererParams) => ReactNode;

export interface ColChooserConfig {
    /**
     * Immediately render changed columns on grid (default true).
     * Set to false to enable Save button for committing changes on save. Desktop only.
     */
    commitOnChange?: boolean;

    /**
     * Show Restore Defaults button (default true). Set to false to hide Restore Grid
     * Defaults button, which immediately commits grid defaults (all column, grouping,
     * and sorting states).
     */
    showRestoreDefaults?: boolean;

    /**
     * Autosize grid columns after committing changes (default false for desktop, true for mobile).
     */
    autosizeOnCommit?: boolean;

    /** Chooser width for popover and dialog. Desktop only. */
    width?: string | number;

    /** Chooser height for popover and dialog. Desktop only. */
    height?: string | number;
}

/**
 * Sort comparator function for a grid column. Note that this comparator will also be called if
 * agGrid-provided column filtering is enabled: it is used to sort values shown for set filter
 * options. In that case, some extra params will be null.
 * @param valueA - cell data valueA to be compared
 * @param valueB - cell data valueB to be compared
 * @param sortDir - either 'asc' or 'desc'
 * @param abs - true to sort by absolute value
 * @param params - additional context about records and column for usage by comparator.
 */
export type ColumnComparator<T = any> = (
    valueA: T,
    valueB: T,
    sortDir: 'asc' | 'desc',
    abs: boolean,
    params: {
        recordA: StoreRecord;
        recordB: StoreRecord;
        agNodeA: IRowNode;
        agNodeB: IRowNode;
        column: Column;
        gridModel: GridModel;
        defaultComparator: (a: T, b: T) => number;
    }
) => number;

export interface CellContext {
    record: StoreRecord;
    column: Column;
    gridModel: GridModel;
}

/**
 * Renderer function for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 *      Note that columns with renderers that access/rely on record fields other than the primary
 *      value should also have their `rendererIsComplex` flag set to true to ensure they are
 *      re-run whenever the record (and not just the primary value) changes.
 * @returns the formatted value for display.
 */
export type ColumnRenderer<T = any> = (value: T, context: CellContext) => ReactNode;

/**
 * Function to return a value to export for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns value for export.
 */
export type ColumnExportValueFn<T = any> = (value: T, context: CellContext) => any;

/**
 * Function to return an excel format for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns excel format
 */
export type ColumnExcelFormatFn<T = any> = (value: T, context: CellContext) => string;

/**
 * Function to return a value for sorting.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns value for sort.
 */
export type ColumnSortValueFn<T = any> = (value: T, context: CellContext) => any;

/**
 * Function to generate grid cell CSS classes.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns CSS class(es) to use.
 */
export type ColumnCellClassFn<T = any> = (
    value: T,
    context: CellContext & {agParams: CellClassParams}
) => Some<string>;

/**
 * Function to determine if a particular CSS class should be added/removed from a cell, via
 * cellClassRules config.
 * @param agParams - as provided by Ag-Grid.  Includes keys:
 *      value - the current cell value.
 *      data - the backing Hoist record for the row, if any.
 * @returns true if the class to which this function is keyed should be added, false if
 *      it should be removed.
 */
export type ColumnCellClassRuleFn = (agParams: CellClassParams) => boolean;

/**
 * Function to produce a grid column tooltip.
 * @param value - cell data value (column + row).
 * @param metadata - additional data about the column and row.
 * @returns the formatted value for display.
 */
export type ColumnTooltipFn<T = any> = (
    value: T,
    cellContext: CellContext & {agParams: ITooltipParams}
) => ReactNode;

/**
 * Function to generate header CSS classes.
 * @param context - contains data about the column and GridModel.
 * @returns CSS class(es) to use.
 */
export type ColumnHeaderClassFn = (context: {
    column: Column | ColumnGroup;
    gridModel: GridModel;
    agParams: HeaderClassParams;
}) => Some<string>;

/**
 * Function to generate a Column header name.
 * Note that using function for the header name will ignore any ag-Grid functionality for
 * decorating the header name, the return value of the function will be used as-is.
 * The function should be treated like an autorun - any subsequent changes to observable properties
 * referenced during the previous execution of the function will trigger a re-render
 * of the column header.
 *
 * @returns the header name to render in the Column header
 */
export type ColumnHeaderNameFn = (params: {
    column?: Column;
    columnGroup?: ColumnGroup;
    gridModel: GridModel;
    agParams: HeaderValueGetterParams;
}) => ReactNode;

/**
 * Function to determine if a Column should be editable or not. This function will be
 * called whenever the user takes some action which would initiate inline editing of a cell
 * before the actual inline editing session is started.
 * @returns true if cell is editable
 */
export type ColumnEditableFn = (params: {
    record: StoreRecord;
    store: Store;
    column: Column;
    gridModel: GridModel;
}) => boolean;

/**
 * Function to return one Grid cell editor. This function will be used to create a new
 * Component, whenever editing is initiated on a cell.
 * The never parameter is never provided - it is included to satisfy typescript. See
 * discussion in https://github.com/xh/hoist-react/pull/3351.
 * @returns the react element to use as the cell editor.
 */
export type ColumnEditorFn = (props: ColumnEditorProps, never?: any) => ReactElement;

/**
 * The object passed into the first argument of {@link ColumnSpec.editor}.
 * Satisfies the {@link EditorProps} of an editor component.
 */
export type ColumnEditorProps = {
    record: StoreRecord;
    column: Column;
    gridModel: GridModel;
    agParams: CustomCellEditorProps;
};

/**
 * Function to update the value of a StoreRecord field after inline editing
 */
export type ColumnSetValueFn<T = any> = (params: {
    value: T;
    record: StoreRecord;
    field: string;
    store: Store;
    column: Column;
    gridModel: GridModel;
    agParams: ValueSetterParams;
}) => void;

/**
 * Function to get the value of a StoreRecord field
 */
export type ColumnGetValueFn<T = any> = (params: {
    record: StoreRecord;
    field: string;
    store: Store;
    column: Column;
    gridModel: GridModel;
}) => T;

export interface ColumnSortSpec {
    /** Direction to sort, either 'asc' or 'desc', or null to remove sort. */
    sort: 'asc' | 'desc' | null;

    /** True to sort by absolute value. */
    abs?: boolean;
}
