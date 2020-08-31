/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


import {parseFieldValue} from '@xh/hoist/data';


/**
 * Generate Options for FilterChooserModel query responses.  Options are anonymos objects
 * (to support Select) that will have the following components:
 *
 *  type - is this a filter suggestion, a field suggestion, or a message? ['filter'|'field'|'msg']
 *  value  - unique value for the underlying select input.
 *  label - unique display for the underlying select input.
 *  isExact -- if based on a matching process, was this an exact, or caseless exact match?
 */

/**
 * Create an option representing a field suggestion
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
 * Create an option representing an existing or suggested filter.
 */
export function filterOption({filter, fieldSpec, isExact = false}) {
    const {fieldType, displayName} = fieldSpec,
        displayValue = fieldSpec.renderValue(parseFieldValue(filter.value, fieldType, null));

    return {
        type: 'filter',
        value: JSON.stringify(filter),
        label: `${displayName} ${filter.op} ${displayValue}`,
        isExact,

        displayValue,
        filter,
        fieldSpec
    };
}

/**
 * Create an option representing an [unselectable] message
 */
export function msgOption(msg) {
    return {
        type: 'msg',
        value: msg,
        label: msg,
        isExact: false
    };
}