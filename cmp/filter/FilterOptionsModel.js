/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {isEmpty, isNil} from 'lodash';

@HoistModel
export class FilterOptionsModel {

    /** @member {FieldFilterSpec[]} */
    @observable.ref specs = [];

    /** @member {Store} */
    store;

    /** @member {string[]} */
    fields;

    /** @member {string} */
    mode;

    /**
     * @param {Object} c - FilterOptionsModel configuration.
     * @param {Store} c.store - Store from which to derive options.
     * @param {string[]} [c.fields] - Store fields to include. If not provided,
     *      all store fields will be included
     */
    constructor({
        store,
        fields
    }) {
        this.store = store;
        this.fields = fields;

        this.addReaction({
            track: () => this.store.lastUpdated,
            run: () => this.updateSpecs()
        });
    }

    //--------------------
    // Implementation
    //--------------------
    @action
    updateSpecs() {
        const {store, fields} = this,
            specs = [];

        store.fields.forEach(it => {
            const {name: field, label: displayName, type: fieldType} = it;

            if (isEmpty(fields) || fields.includes(field)) {
                const filterType = this.getFilterType(fieldType),
                    spec = {field, fieldType, filterType, displayName};

                if (filterType === 'value') {
                    const values = new Set();
                    store.records.forEach(record => {
                        const value = record.get(field);
                        if (!isNil(value)) values.add(value);
                    });

                    spec.values = values.map(value => {
                        const displayValue = this.getFilterDisplayValue(value, fieldType);
                        return {value, displayValue};
                    });
                }

                specs.push(spec);
            }
        });

        this.specs = specs;
    }

    getFilterType(fieldType) {
        switch (fieldType) {
            case 'int':
            case 'number':
            case 'date':
            case 'localDate':
                return 'range';
            default:
                return 'value';
        }
    }

    getFilterDisplayValue(value, fieldType) {
        let displayValue = value;
        if (fieldType === 'date' || fieldType === 'localDate') {
            displayValue = fmtDate(value);
        }
        return displayValue.toString();
    }
}

/**
 * @typedef FieldFilterSpec
 * @property {string} field - Name of field
 * @property {string} fieldType - Type of field. @see Field.type for available options.
 * @property {string} filterType - Filter type, either 'range' or 'value'. Determines what operations are applicable for the field.
 *      Type 'range' indicates the field should use mathematical / logical operations (i.e. '>', '>=', '<', '<=', '=', '!=')
 *      Type 'value' indicates the field should use equality operations against a set of values (i.e. '=', '!=')
 * @property {string} [displayName] - Name suitable for display to user, defaults to field (e.g. 'Country')
 * @property {FilterValue[]} [values] - Available value options. Only applicable when type == 'value'
 */

/**
 * @typedef FilterValue
 * @property {*} value - Value
 * @property {string} [displayValue] - Value suitable for display to user, defaults to value
 */