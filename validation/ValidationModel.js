/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {computed} from '@xh/hoist/mobx';
import {forOwn, values} from 'lodash';

/**
 * Monitors model and provides observable validation state, according to a set
 * of configured validation rules.
 */
@HoistModel()
export class ValidationModel {

    /** @member {Object} - Map of Validators by field */
    validators;
    /** @member {Object} - HoistModel we are validating. */
    model;

    /**
     * Are all validating fields currently valid? .
     */
    @computed
    get isValid() {
        return this.validators.every(it => it.isValid);
    }

    /**
     * Are any of the validated fields currently pending?
     */
    @computed
    get isPending() {
        return this.validators.some(it => it.isPending);
    }
    
    /**
     * Current errors by field.
     *
     * @returns {Object} - Map of String[] by field name.
     */
    @computed
    get errors() {
        const ret = {},
        forOwn(validators, ({errors}, field) => {
            if (errors) ret[field] = errors;
        });
        return ret;
    }

    /**
     *
     * @param {Object[]} rules - collection of configs for Rules
     * @param {Object} model - HoistModel to validate
     */
    constructor({rules, model}) {
        this.model = model;
        this.validators = parseRules(rules);
    }


    //------------------
    // Implementation
    //------------------
    parseRules(rules) {
        const {validators, model} = this;
        const byField = groupBy(rules, 'field');
        forOwn(byField, (rules, field) => {
            if (!model[field]) {
                console.warn(`Validation rule incorrect.  ${field} is not found in model.`);
            }
            rules = rules.map(config => new Rule(config));
            validators[field] = new Validator({field, model, rules});
        });
    }

    destroy() {
        XH.destroy(values(this.validators));
    }
}