/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


import {parseFieldValue} from '@xh/hoist/data';


/**
 * Factory to generate options for FilterChooserModel query responses.
 */
export class Option {

    /**
     * @return {FilterChooserOption} - an option representing an existing or suggested filter.
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
     * @return {FilterChooserOption} - an option representing a field suggestion.
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
     * @return {FilterChooserOption} - an option representing an (unselectable) message.
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

/**
 * @typedef {Object} FilterChooserOption - option generated for a `FilterChooser` `Select` input.
 * @property {string} type - one of ['filter'|'field'|'msg'] - indicates if option allows user to
 *      select a fully-formed filter or a field to use for filtering, or if option is an
 *      unselectable informational message.
 * @property {string} matchType - one of ['field'|'value'|null] - if option of a selectable filter
 *      or field type, indicates what the user input matched against to produce.
 * @property {string} value  - unique value for the underlying Select.
 * @property {string} label - unique display for the underlying Select.
 */
