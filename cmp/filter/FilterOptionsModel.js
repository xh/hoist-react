/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isEmpty, isNil, isString} from 'lodash';

import {FieldFilterSpec} from './FieldFilterSpec';

@HoistModel
export class FilterOptionsModel {

    /** @member {FieldFilterSpec[]} */
    @observable.ref fieldSpecs = [];

    /** @member {Store} */
    store;

    /** @member {string[]} */
    fields;

    /** @member {string} */
    mode;

    /**
     * @param {Object} c - FilterOptionsModel configuration.
     * @param {Store} c.store - Store from which to derive options.
     * @param {(string[]|Object[])} [c.fields] - List of store fields to create FieldFilterSpecs.
     *      Can provide either just a string field name, or a partial FieldFilterSpec config.
     *      FieldFilterSpecs will be created for each field, extracting unspecified properties from
     *      the Store. If empty or not provided, FieldFilterSpec will generated for all store fields.
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
        const {store} = this,
            fieldCfgs = this.fields.map(field => isString(field) ? {field} : field),
            fieldSpecs = [];

        store.fields.forEach(storeField => {
            const fieldCfg = fieldCfgs.find(f => f.field === storeField.name);

            if (fieldCfg || isEmpty(fieldCfgs)) {
                // Set defaults from store
                const fieldSpec = new FieldFilterSpec({
                    displayName: storeField.label,
                    fieldType: storeField.type,
                    ...fieldCfg
                });

                // Set values from store, if not specified
                if (fieldSpec.filterType === 'value' && isNil(fieldCfg.values)) {
                    const values = new Set();
                    store.records.forEach(record => {
                        const value = record.get(fieldSpec.field);
                        if (!isNil(value)) values.add(value);
                    });
                    fieldSpec.setValues(values);
                }

                fieldSpecs.push(fieldSpec);
            }
        });

        this.fieldSpecs = fieldSpecs;
    }
}