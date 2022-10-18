/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {parseFieldValue} from '@xh/hoist/data';
import {isNil} from 'lodash';
import {FieldType} from '../../../data';

// ---------------------------------------------------------
// Generate Options for FilterChooserModel query responses.
// Options are simple objects to support Select API.
//----------------------------------------------------------
/**
 * Create an option representing a detailed field suggestion
 * @returns {FilterChooserOption}
 */
export function fieldOption({fieldSpec, isExact = false}) {
    const {displayName} = fieldSpec;
    return {
        type: 'field',
        value: JSON.stringify({displayName}),
        label: displayName,
        isExact,
        fieldSpec
    };
}

/**
 * Create an option representing a minimal field suggestion
 * @returns {FilterChooserOption}
 */
export function minimalFieldOption({fieldSpec}) {
    const {displayName} = fieldSpec;
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
 * @returns {FilterChooserOption}
 */
export function fieldFilterOption({filter, fieldSpec, isExact = false}) {
    let {fieldType, displayName} = fieldSpec,
        displayOp,
        displayValue;

    if (isNil(filter.value) && (filter.op === '!=' || filter.op === '=')) {
        displayOp = 'is';
        displayValue = (filter.op === '!=' ? 'not blank' : 'blank');
    } else {
        displayOp = filter.op;
        fieldType = fieldType === FieldType.TAGS ? FieldType.STRING : fieldType;
        displayValue = fieldSpec.renderValue(parseFieldValue(filter.value, fieldType, null));
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
 * @returns {FilterChooserOption}
 */
export function compoundFilterOption({filter, fieldNames}) {
    return {
        type: 'filter',
        value: JSON.stringify(filter),
        label: `[${filter.op} Filter on ${fieldNames.join(', ')}]`,
        isExact: false
    };
}

/**
 * Create an option representing an [unselectable] message
 * @returns {FilterChooserOption}
 */
export function msgOption(msg) {
    return {
        type: 'msg',
        value: msg,
        label: msg,
        isExact: false
    };
}

/**
 * @typedef {Object} FilterChooserOption - option generated for a `FilterChooser` `Select` input.
 * @property {string} type - one of ['filter'|'field'|'msg'] - indicates if option allows user to
 *      select a fully-formed filter or a field to use for filtering, or if option is an
 *      unselectable informational message.
 * @property {string} value - unique value for the underlying Select.
 * @property {string} label - unique display for the underlying Select.
 * @property {boolean} isExact - if based on a matching process, was this an exact match?
 */
