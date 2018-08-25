/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {computed} from '@xh/hoist/mobx';
import {forOwn, values, groupBy} from 'lodash';

import {Rule} from './Rule';
import {Validator} from './Validator';

/**
 * Monitors model and provides observable validation state, according to a set
 * of configured validation rules.
 */
@HoistModel()
export class ValidationModel {

    _validators;
    model;

    /**
     * Validators for individual fields.
     *
     * @return {Validator[]}
     */
    get validators() {
        return values(this._validators);
    }

    /**
     * Get a validator (if any) for a given field.
     *
     * @param {string} field
     */
    getValidator(field) {
        return this.validators[field];
    }

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
     *
     * @param {Object[]} rules - collection of configs for Rules
     * @param {Object} model - HoistModel to validate
     */
    constructor({rules, model}) {
        this.model = model;
        this.parseRules(rules);
    }

    //------------------
    // Implementation
    //------------------
    parseRules(rules) {
        const {model} = this,
            byField = groupBy(rules, 'field');
        forOwn(byField, (rules, field) => {
            if (!model[field]) {
                console.warn(`Validation rule incorrect.  ${field} is not found in model.`);
                return;
            }
            rules = rules.map(config => new Rule(config));
            this._validators[field] = (new Validator({field, model, rules}));
        });
    }

    destroy() {
        XH.destroy(this.validators);
    }
}