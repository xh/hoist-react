/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {GridFilterFieldSpecConfig} from '@xh/hoist/cmp/grid/filter/GridFilterFieldSpec';
import {HSide, PersistOptions, PlainObject, SizingMode, Some} from '@xh/hoist/core';
import {Store, StoreRecord, View} from '@xh/hoist/data';
import {ReactElement, ReactNode } from 'react';
import {Column} from './columns/Column';
import {ColumnGroup} from './columns/ColumnGroup';
import {GridModel} from './GridModel';

export interface ColumnState {
    colId: string;
    width: number;
    hidden: boolean;

    /** has this column been resized manually? */
    manuallySized?: boolean;
    /** Side if pinned, null if not. */
    pinned?: HSide;
}

export interface AutosizeState {
    /** Sizing mode used last time the columns were autosized. */
    sizingMode?: SizingMode;
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
    groupAVal: any,
    groupBVal: any,
    groupField: string,
    metadata: {
        gridModel: GridModel,
        nodeA: PlainObject,
        nodeB: PlainObject,
    }) => number;

/**
 * Closure to generate CSS class names for a row.
 * @param record - the StoreRecord associated with the rendered row.
 * @returns CSS class(es) to apply to the row level.
 */
export type RowClassFn = (record: StoreRecord) => Some<string>;

/**
 * Function to determine if a particular CSS class should be added/removed from a row,
 * via rowClassRules config.
 * @param agParams - as provided by AG-Grid. (RowClassParams).  Note that when a RowClassRuleFn is
 *      called by the GridAutosizeService, it is only provided with an object with the 'data' key,
 *      not the entire RowClassParams params.
 * @returns true if the class to which this function is keyed should be added, false if
 *      it should be removed.
 */
export type RowClassRuleFn = (agParams: PlainObject) => boolean;


export interface GridModelPersistOptions extends PersistOptions {

    /** True to include column information (default true) */
    persistColumns?: boolean;
    /** True to include grouping information (default true) */
    persistGrouping?: boolean;
    /** True to include sorting information (default true) */
    persistSort?: boolean;

    /**
     * Key to be used to identify location of legacy grid state from LocalStorage.
     * This key will identify the pre-v35 location for grid state, and will be used
     * as an initial source of grid state after an upgrade to v35.0.0 or greater.
     * Defaults to the new value of 'key'.  If no legacy state is available at this
     * location, the key is ignored.
     */
    legacyStateKey?: string;
}


export interface GridFilterModelConfig {
    /**
     * Store / Cube View to be filtered as column filters are applied. Defaulted to the
     * gridModel's store.
     */
    bind?: Store|View;

    /**
     * Specifies the fields this model supports for filtering. Should be configs for
     * {@link GridFilterFieldSpec}, string names to match with Fields in bound Store/View, or omitted
     * entirely to indicate that all fields should be filter-enabled.
     */
    fieldSpecs?: Array<string|GridFilterFieldSpecConfig>;

    /** Default properties to be assigned to all fieldSpecs created by this model. */
    fieldSpecDefaults?: GridFilterFieldSpecConfig
}


/**
 * Renderer for a group row
 * @param context - The group renderer params from ag-Grid. (ICellRendererParams)
 * @returns the formatted value for display.
 */
export type GroupRowRenderer = (context: PlainObject) => ReactNode;


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
    width?: number;

    /** Chooser height for popover and dialog. Desktop only. */
    height?: number;
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
export type ColumnComparator<T=any> = (
    valueA: T,
    valueB: T,
    sortDir: 'asc'|'desc',
    abs: boolean,
    params: {
        recordA: StoreRecord,
        recordB: StoreRecord,
        agNodeA: PlainObject,
        agNodeB: PlainObject,
        column: Column,
        gridModel: GridModel,
        defaultComparator: (a: T, b: T) => number;
    }) => number;

/**
 * Renderer function for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 *      Note that columns with renderers that access/rely on record fields other than the primary
 *      value should also have their `rendererIsComplex` flag set to true to ensure they are
 *      re-run whenever the record (and not just the primary value) changes.
 * @returns the formatted value for display.
 */
export type ColumnRenderer<T=any> = (value: T, context: CellContext) => ReactNode;

/**
 * Function to return a value to export for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns value for export.
 */
export type ColumnExportValueFn<T=any> = (value: T, context: CellContext) => any;

/**
 * Function to return an excel format for a grid cell.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns excel format
 */
export type ColumnExcelFormatFn<T=any> = (value: T, context: CellContext) => string;


/**
 * Function to return a value for sorting.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns value for sort.
 */
export type ColumnSortValueFn<T=any> = (value: T, context: CellContext) => any;

/**
 * Function to generate grid cell CSS classes.
 * @param value - cell data value (column + row).
 * @param context - additional data about the column, row and GridModel.
 * @returns CSS class(es) to use.
 */
export type ColumnCellClassFn<T=any> = (value: T, context: CellContext) => Some<string>;

/**
 * Function to determine if a particular CSS class should be added/removed from a cell, via
 * cellClassRules config.
 * @param agParams - as provided by Ag-Grid (CellClassParams).  Includes keys:
 *      value - the current cell value.
 *      data - the backing Hoist record for the row, if any.
 * @returns true if the class to which this function is keyed should be added, false if
 *      it should be removed.
 */
export type ColumnCellClassRuleFn = (agParams: PlainObject) => boolean;

/**
 * Function to generate header CSS classes.
 * @param context - contains data about the column and GridModel.
 * @returns CSS class(es) to use.
 */
export type ColumnHeaderClassFn = (context: HeaderContext) => Some<string>;

export interface CellContext {
    record: StoreRecord;
    column: Column;
    gridModel: GridModel;

    /** ag-Grid cell renderer params */
    agParams?: PlainObject;
}

export interface HeaderContext {
    column: Column|ColumnGroup;
    gridModel: GridModel;

    /** ag-Grid header renderer params */
    agParams?: PlainObject;
}

/**
 * Function to produce a grid column tooltip.
 * @param value - cell data value (column + row).
 * @param metadata - additional data about the column and row.
 * @returns the formatted value for display.
 */
export type ColumnTooltipFn<T=any> = (value: T, metadata: TooltipMetadata) => string;

/**
 * Function to produce a grid column tooltip.
 * @param value - cell data value (column + row).
 * @param metadata - additional data about the column and row.
 * @returns the formatted value for display.
 */
export type ColumnTooltipElementFn<T=any> = (value: T, metadata: TooltipMetadata) => ReactNode;

export interface TooltipMetadata {
    record: StoreRecord;
    column: Column;
    gridModel: GridModel;

    /** The ag-grid tooltip params. (ITooltipParams) */
    agParams: PlainObject;
}

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
export type ColumnHeaderNameFn = (
    params: {
        column?: Column,
        columnGroup?: ColumnGroup,
        gridModel: GridModel,
        agParams: PlainObject
    }
) => ReactNode;

/**
 * Function to determine if a Column should be editable or not. This function will be
 * called whenever the user takes some action which would initiate inline editing of a cell
 * before the actual inline editing session is started.
 * @returns true if cell is editable
 */
export type ColumnEditableFn = (
    params: {
        record: StoreRecord,
        store: Store,
        column: Column,
        gridModel: GridModel
    }
) => boolean

/**
 * Function to return one Grid cell editor.  This value will be used to create a new Component
 * whenever editing is initiated on a cell.
 * @returns the react element to use as the cell editor.
 */
export type ColumnEditorFn = (
    params: {
        record: StoreRecord,
        column: Column,
        gridModel: GridModel
    }
) => ReactElement

/**
 * Function to update the value of a StoreRecord field after inline editing
 * Includes the ag-Grid value setter params. (CellClassParams)
 */
export type ColumnSetValueFn<T=any> = (
    params: {
        value: T,
        record: StoreRecord,
        field: string,
        store: Store,
        column: Column,
        gridModel: GridModel,
        agParams: PlainObject
    }
) => void;

/**
 * Function to get the value of a StoreRecord field
 * Includes the ag-Grid value getter params. (ValueGetterParams)
 */
export type ColumnGetValueFn<T=any> = (
    params: {
        record: StoreRecord,
        field: string,
        store: Store,
        column: Column,
        gridModel: GridModel,
        agParams: PlainObject
    }
) => T;

export interface ColumnSortSpec {
    /** Direction to sort, either 'asc' or 'desc', or null to remove sort. */
    sort: string;

    /** True to sort by absolute value. */
    abs?: boolean;
}

