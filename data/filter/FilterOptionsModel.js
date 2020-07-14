/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {isDate, isEmpty} from 'lodash';

@HoistModel
export class FilterOptionsModel {

    /** @member {FieldFilterSpec[]} */
    @observable.ref specs = [];

    /** @member {(Cube|Store)} */
    source;

    /** @member {string[]} */
    fields;

    /** @member {string} */
    mode;

    /**
     * @param {Object} c - FilterOptionsModel configuration.
     * @param {(Cube|Store)} c.source - Options source.
     * @param {string[]} [c.fields] - Source fields to include. If not provided,
     *      all source fields will be included
     */
    constructor({
        source,
        fields
    }) {
        this.source = source;
        this.fields = fields;

        if (source.isCube) {
            this.mode = MODES.cube;
            this.initCubeMode();
        } else if (source.isStore) {
            this.mode = MODES.store;
            this.initStoreMode();
        }
    }

    //--------------------
    // Cube
    //--------------------
    initCubeMode() {
        this.cubeView = this.source.createView({
            query: {includeLeaves: true},
            connect: true
        });

        this.addReaction({
            track: () => this.cubeView.result,
            run: () => this.setSpecsFromCubeView()
        });
    }

    @action
    setSpecsFromCubeView() {
        const {cubeView, fields} = this,
            dimVals = cubeView.getDimensionValues(),
            specs = [];

        dimVals.forEach(dimVal => {
            const {name, label: displayName, type: fieldType} = dimVal.field;

            if (isEmpty(fields) || fields.includes(name)) {
                const type = this.getFilterType(fieldType),
                    spec = {name, type, displayName};

                if (type === 'value') {
                    spec.values = dimVal.values.map(value => {
                        return {
                            value,
                            displayValue: this.getFilterDisplayValue(value)
                        };
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

    getFilterDisplayValue(value) {
        let displayValue = value;
        if (isDate(value) || value.isLocalDate) {
            displayValue = fmtDate(value);
        }
        return displayValue.toString();
    }

    //--------------------
    // Store
    //--------------------
    initStoreMode() {
        // Todo: Implement Store Mode
    }
}

const MODES = {
    cube: 'cube',
    store: 'store'
};

/**
 * @typedef FieldFilterSpec
 * @property {string} name - Name of field
 * @property {string} type - Field type, either 'range' or 'value'. Determines what operations are applicable for the field.
 *      Type 'range' indicates the field should use mathematical / logical operations (i.e. '>', '>=', '<', '<=', '==', '!=')
 *      Type 'value' indicates the field should use equality operations against a set of values (i.e. '==', '!=')
 * @property {string} [displayName] - Name suitable for display to user, defaults to name (e.g. 'Country')
 * @property {FilterValue[]} [values] - Available value options. Only applicable when type == 'value'
 */

/**
 * @typedef FilterValue
 * @property {*} value - Value
 * @property {string} [displayValue] - Value suitable for display to user, defaults to value
 */