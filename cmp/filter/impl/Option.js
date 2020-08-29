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
 *  matchType - if suggestion, what type of match triggered? --  ['field'|'value'|null]
 *  value  - unique value for the underlying select input.
 *  label - unique display for the underlying select input.
 */
export class Option {

    /**
     * Create an option representing an existing or suggested filter.
     */
    static createFilterOption(filter, spec, matchType = null) {
        const {value, op} = filter,
            {fieldType, displayName} = spec,
            displayValue = spec.renderValue(parseFieldValue(value, fieldType, null));

        return {
            type: 'filter',
            matchType,
            value: JSON.stringify(filter),
            label: `${displayName} ${op} ${displayValue}`,

            displayName,
            displayValue,
            op
        };
    }

    /**
     * Create an option representing a field suggestion
     */
    static createFieldOption(fieldSpec) {
        const {displayName, ops} = fieldSpec;
        return {
            type: 'field',
            matchType: 'field',
            value: JSON.stringify({displayName}),
            label: displayName,

            displayName,
            ops
        };
    }

    /**
     * Create an option representing an [unselectable] message
     */
    static createMessageOption(msg) {
        return {
            type: 'msg',
            matchType: null,
            value: msg,
            label: msg
        };
    }
}