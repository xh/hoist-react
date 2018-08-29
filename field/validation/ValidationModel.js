/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {computed} from '@xh/hoist/mobx';
import {values} from 'lodash';

import {Rule} from './Rule';
import {Validator} from './Validator';
import {ValidationState} from './ValidationState';

/**
 * Monitors model and provides observable validation state, according to a set
 * of configured validation rules.
 */
@HoistModel()
export class ValidationModel {

    _validators = {};
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
        return this._validators[field];
    }

    /**
     * Return ValidationState of this model.
     */
    @computed
    get state() {
        const VS = ValidationState,
            states = this.validators.map(v => v.state);
        if (states.includes(VS.NotValid))   return VS.NotValid;
        if (states.includes(VS.Unknown))    return VS.Unknown;
        return VS.Valid;
    }

    /**
     * Are any of the validated fields currently pending?
     */
    @computed
    get isPending() {
        return this.validators.some(it => it.isPending);
    }

    /** Is the state of this model ValidationState.Valid **/
    get isValid() {
        return this.state == ValidationState.Valid;
    }

    /** Is the state of this model ValidationState.NotValid **/
    get isNotValid() {
        return this.state == ValidationState.NotValid;
    }

    /**
     * @param {Object} model - HoistModel to validate
     */
    constructor(model) {
        this.model = model;
    }

    /**
     * Add validation rules for a field in this model.
     *
     * @param {String} field
     * @param {...(Rule|Object)} configs - configurations for Rules.
     */
    addRules(field, ...rules) {
        const {model, _validators} = this;

        rules = rules.map(r => r instanceof Rule ? r : new Rule(r));

        let validator = _validators[field];
        if (!validator) {
            _validators[field] = new Validator({field, model, rules});
        } else {
            validator.addRules(rules);
        }
    }

    /**
     * Reset all validators.
     */
    reset() {
        this.validators.forEach(v => v.reset());
    }

    /**
     * Start all validators
     */
    start() {
        this.validators.forEach(v => v.start());
    }
    
    destroy() {
        XH.destroy(this.validators);
    }
}