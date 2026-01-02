/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {parseFieldValue} from '@xh/hoist/data';
import {isNil} from 'lodash';
import {FilterChooserFieldSpec} from '../FilterChooserFieldSpec';

export interface FilterChooserOption {
    /**
     * Indicates if option allows user to select a fully-formed filter, or a field to use for
     * filtering, or if option is an unselectable informational message.
     */
    type: 'filter' | 'field' | 'msg' | 'minimalField';
    /** Unique value for the underlying Select. */
    value: string;
    /** Unique display for the underlying Select. */
    label: string;
    /** If based on a matching process, was this an exact match? */
    isExact: boolean;
    /** Additional properties specific to the option type */
    [key: string]: any;
}

// ---------------------------------------------------------
// Generate Options for FilterChooserModel query responses.
// Options are simple objects to support Select API.
//----------------------------------------------------------
/**
 * Create an option representing a detailed field suggestion.
 */
export function fieldOption({fieldSpec, isExact = false}): FilterChooserOption {
    const {displayName} = fieldSpec as FilterChooserFieldSpec;
    return {
        type: 'field',
        value: JSON.stringify({displayName}),
        label: displayName,
        isExact,
        fieldSpec
    };
}

/**
 * Create an option representing a minimal field suggestion.
 */
export function minimalFieldOption({fieldSpec}): FilterChooserOption {
    const {displayName} = fieldSpec as FilterChooserFieldSpec;
    return {
        type: 'minimalField',
        value: JSON.stringify({displayName}),
        label: displayName,
        isExact: false,
        fieldSpec
    };
}

/**
 * Create an option representing an existing or suggested FieldFilter.
 */
export function fieldFilterOption({filter, fieldSpec, isExact = false}): FilterChooserOption {
    let {fieldType, displayName} = fieldSpec as FilterChooserFieldSpec,
        displayOp,
        displayValue;

    if (isNil(filter.value) && (filter.op === '!=' || filter.op === '=')) {
        displayOp = 'is';
        displayValue = filter.op === '!=' ? 'not blank' : 'blank';
    } else {
        displayOp = filter.op;
        fieldType = fieldType === 'tags' ? 'string' : fieldType;
        displayValue = fieldSpec.renderValue(
            parseFieldValue(filter.value, fieldType, null),
            filter.op
        );
    }

    return {
        type: 'filter',
        value: JSON.stringify(filter),
        label: `${displayName} ${displayOp} ${displayValue}`,
        isExact,

        displayOp,
        displayValue,
        filter,
        fieldSpec
    };
}

/**
 * Create an option representing a compound filter. For display purposes only.
 */
export function compoundFilterOption({filter, fieldNames}): FilterChooserOption {
    return {
        type: 'filter',
        value: JSON.stringify(filter),
        label: `[${filter.op} Filter on ${fieldNames.join(', ')}]`,
        isExact: false
    };
}

/**
 * Create an option representing an [unselectable] message
 */
export function msgOption(msg: string): FilterChooserOption {
    return {
        type: 'msg',
        value: msg,
        label: msg,
        isExact: false
    };
}
