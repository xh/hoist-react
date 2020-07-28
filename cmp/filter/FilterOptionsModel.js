/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, isNil, isString} from 'lodash';

import {FilterOptionsSpec} from './FilterOptionsSpec';

@HoistModel
export class FilterOptionsModel {

    /** @member {FilterOptionsSpec[]} */
    @observable.ref specs = [];

    /** @member {Store} */
    store;

    /** @member {string} */
    storeMode;

    /** @member {string[]} */
    fields;

    /**
     * @param {Object} c - FilterOptionsModel configuration.
     * @param {Store} c.store - Store from which to derive options.
     * @param {string} [c.storeMode] - Whether to use Store.records or Store.allRecords to collect
     *      FilterOptionsSpec values. Either 'all' or 'filtered'. Defaults to 'filtered'.
     * @param {(string[]|Object[])} [c.fields] - List of store fields to create FilterOptionsSpecs.
     *      Can provide either just a string field name, or a partial FilterOptionsSpec config.
     *      FilterOptionsSpecs will be created for each field, extracting unspecified properties from
     *      the Store. If empty or not provided, FilterOptionsSpecs will generated for all store fields.
     */
    constructor({
        store,
        storeMode = 'filtered',
        fields
    }) {
        throwIf(!['filtered', 'all'].includes(storeMode), `Store mode ${storeMode} not recognized.`);

        this.store = store;
        this.storeMode = storeMode;
        this.fields = fields;

        this.addReaction({
            track: () => this.store.lastUpdated,
            run: () => this.updateSpecs()
        });
    }

    /**
     * Find the option spec for a given field.
     * @param {string} field
     * @returns {FilterOptionsSpec}
     */
    getSpec(field) {
        return this.specs.find(spec => spec.field === field);
    }

    //--------------------
    // Implementation
    //--------------------
    @action
    updateSpecs() {
        const {store, storeMode} = this,
            fieldCfgs = this.fields?.map(field => isString(field) ? {field} : field) ?? [],
            specs = [];

        store.fields.forEach(storeField => {
            const fieldCfg = fieldCfgs.find(f => f.field === storeField.name);

            if (fieldCfg || isEmpty(fieldCfgs)) {
                // Set defaults from store
                const specCfg = {
                    field: storeField.name,
                    displayName: storeField.label,
                    fieldType: storeField.type,
                    ...fieldCfg
                };

                // Set values from store, if not specified
                if (isNil(fieldCfg?.values)) {
                    const values = new Set(),
                        records = storeMode === 'filtered' ? store.records : store.allRecords;

                    records.forEach(record => {
                        const value = record.get(specCfg.field);
                        if (!isNil(value)) values.add(value);
                    });

                    specCfg.values = values;
                }

                specs.push(new FilterOptionsSpec(specCfg));
            }
        });

        this.specs = specs;
    }
}