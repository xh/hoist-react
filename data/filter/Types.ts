/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {Filter} from './Filter';
import {StoreRecord, Field, FieldType} from '../';

export type CompoundFilterOperator = 'AND' | 'OR' | 'and' | 'or';
export interface CompoundFilterSpec {
    /** Collection of Filters or configs to create. */
    filters: FilterLike[];

    /** logical operator 'AND' (default) or 'OR'. */
    op?: CompoundFilterOperator;
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
export interface FieldFilterSpec {
    /** Name of Field to filter or Field instance. */
    field: string | Field;

    /** One of the supported operators to use for comparison. */
    op: FieldFilterOperator;

    value: any;

    /** For internal serialization only. */
    valueType?: FieldType;
}

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

export type FilterSpec = FieldFilterSpec | FunctionFilterSpec | CompoundFilterSpec;

export type FilterLike = Filter | FilterSpec | FilterTestFn | FilterLike[];
