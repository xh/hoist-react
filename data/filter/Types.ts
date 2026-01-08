/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {Filter} from './Filter';
import {StoreRecord, Field, FieldType} from '../';

export type FilterLike = Filter | FilterSpec | FilterTestFn | FilterLike[];

export type FilterSpec = FieldFilterSpec | FunctionFilterSpec | CompoundFilterSpec;

export interface FieldFilterSpec {
    /** Name of Field to filter or Field instance. */
    field: string | Field;

    /** One of the supported operators to use for comparison. */
    op: FieldFilterOperator;

    value: any;

    /** For internal serialization only. */
    valueType?: FieldType;
}

export type FieldFilterOperator =
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'like'
    | 'not like'
    | 'begins'
    | 'not begins'
    | 'ends'
    | 'not ends'
    | 'includes'
    | 'excludes';

export interface CompoundFilterSpec {
    /** Collection of Filters or configs to create. */
    filters: FilterLike[];

    /** logical operator 'AND' (default) or 'OR'. */
    op?: CompoundFilterOperator;
}

export type CompoundFilterOperator = 'AND' | 'OR' | 'and' | 'or';

export interface FunctionFilterSpec {
    /** Key used to identify this FunctionFilter.*/
    key: string;

    /** Function to evaluate a StoreRecord or data object.*/
    testFn: FilterTestFn;
}

/**
 * Function to evaluate an object for validation.
 * @param candidate - single Hoist StoreRecord or plain JS Object to evaluate.
 * @returns  true if the candidate passes and should be included in filtered results.
 */
export type FilterTestFn = (candidate: PlainObject | StoreRecord) => boolean;

/**
 * Target (typically a {@link Store} or Cube {@link View}) that can be used by filtering models
 * such as {@link FilterChooserModel} and {@link GridFilterModel} to get and set filters.
 */
export interface FilterBindTarget {
    filter: Filter;
    setFilter(filter: FilterLike): unknown;
}

/**
 * Data provider (typically a {@link Store} or Cube {@link View}) that can be used by filtering
 * models such as {@link FilterChooserModel} and {@link GridFilterModel} to source available
 * values from within a dataset for display / suggestion to users.
 */
export interface FilterValueSource {
    isFilterValueSource: true;
    /** Names of all fields available in the source. */
    fieldNames: string[];
    /** @returns the Field instance for the given field name. */
    getField(fieldName: string): Field;
    /** @returns unique values for the given field, applying the given filter if provided. */
    getValuesForFieldFilter(fieldName: string, filter?: Filter): any[];
    /** Observable timestamp for the source's data, to trigger consumers to re-query values. */
    lastUpdated: number;
}

export function isFilterValueSource(v: unknown): v is FilterValueSource {
    return (v as any)?.isFilterValueSource === true;
}
