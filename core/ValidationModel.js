/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action, computed} from '@xh/hoist/mobx';
import {has, hasIn, isEmpty, forOwn, values, flatten, castArray, keys, some} from 'lodash';
import {PendingTaskModel} from '../utils/async/PendingTaskModel';

export const ValidationModelState = {
    PENDING: 'PENDING',
    VALID: 'VALID',
    INVALID: 'INVALID'
};

/**
 * Monitors fields in a model and updates the validation state when they change
 */
@HoistModel()
export class ValidationModel {
    /** The rules for validating each field */
    constraints;

    /** The model we are validating */
    model;

    @observable validationStatus = {};

    get state() {
        if (some(values(this.validationStatus, fieldStatus => fieldStatus.asyncModel.isPending))) {
            return ValidationModelState.PENDING;
        }

        return this._haveErrors() ? ValidationModelState.INVALID : ValidationModelState.VALID;
    }

    @computed
    get isValid() {
        return !this._haveErrors();
    }

    _haveErrors() {
        return some(values(this.validationStatus), fieldStatus => !isEmpty(fieldStatus.errors));
    }

    /**
     * @param params
     * @param params.constraints {Object} The validate.js constraints configuration object. @see https://validatejs.org/#constraints
     * @param params.model {Object} The model to validate
     */
    constructor({rules, model}) {
        this.rules = rules;
        this.model = model;

        // Add reactions to validate individual fields on the model when they change
        forOwn(rules, (fieldRule, field) => {
            // It is important to use hasIn here instead of has because the validation model will
            // often be instantiated during construction of the model passed in here, so has or
            // hasOwnProperty will fail most of the time. hasIn or the in operator will return true
            // since the fields exist on the prototype.

            if (!hasIn(model, field)) {
                console.warn(
                    `ValidationModel has config for field '${field}' which is not present in the model: `,
                    model,
                    'field rules: ',
                    fieldRule
                );

                return;
            }

            this.validationStatus[field] = {
                asyncModel: new PendingTaskModel('all'),
                errors: []
            };

            this.addReaction({
                track: () => {
                    const ret = [model[field]];
                    if (fieldRule.track) {
                        ret.push(...fieldRule.track());
                    }
                    return ret;
                },
                run: () => this.validateField(field)
            });
        });

        this.validate();
    }

    getFieldState(field) {
        const fieldStatus = this.validationStatus[field];
        if (!fieldStatus) {
            return ValidationModelState.VALID;
        }

        if (fieldStatus.asyncModel.isPending) {
            return ValidationModelState.PENDING;
        }

        return isEmpty(fieldStatus.errors) ?
            ValidationModelState.VALID :
            ValidationModelState.INVALID;
    }

    /**
     * Check field validity
     *
     * @param field - The field to check
     * @returns {boolean}
     */
    isFieldValid(field) {
        return this.getFieldState(field) === ValidationModelState.VALID;
    }

    /**
     * Returns a flat list of validation error messages
     *
     * @param {string[]|string} [fields] - optional fields to include
     * @returns {string[]}
     */
    listErrors(fields) {
        if (fields) {
            fields = castArray(fields);
        } else {
            fields = keys(this.validationStatus);
        }

        return flatten(fields.map(field => {
            if (!has(this.validationStatus, field)) {
                return [];
            }

            return this.validationStatus[field].errors;
        }));
    }

    // ----------------------
    // Implementation
    // ----------------------

    @action
    validateField(field) {
        const fieldRules = this.rules[field];
        if (!fieldRules) return;

        const {model} = this,
            fieldStatus = this.validationStatus[field],
            value = model[field];

        fieldStatus.errors = [];
        fieldRules.rules.forEach(rule => {
            const params = {value, model, field, rule, fieldRules};

            if (rule.active && !rule.active(params)) {
                return;
            }

            const ret = rule.check(params);
            if (typeof ret === 'string') {
                fieldStatus.errors.push(ret);
            } else if (ret instanceof Promise) {
                ret.then((result) => {
                    // Make sure this async validation rule ran against the current value of the field
                    if (value !== this.model[field]) {
                        console.debug(`Ignoring async validation rule for field '${field}' result because it was started with a different value (${value}) than the current value (${this.model[field]}) ! `);
                        return;
                    }

                    if (typeof ret === 'string') {
                        fieldStatus.errors.push(result);
                    }
                }).linkTo(fieldStatus.asyncModel);
            }
        });
    }

    @action
    validate() {
        keys(this.rules).forEach(field => this.validateField(field));
    }
}