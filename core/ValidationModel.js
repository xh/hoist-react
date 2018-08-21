/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {validate} from 'validate.js/validate.js';
import {has, hasIn, pick, omit, isEmpty, assign, forOwn, values, flatten, castArray} from 'lodash';

/**
 * Monitors fields in a model and updates the validation state when they change
 */
@HoistModel()
export class ValidationModel {
    /** The rules for validating each field */
    constraints;

    /** The model we are validating */
    model;

    /** Whether the current validation state is valid or not */
    @observable isValid;

    /** The current validation errors */
    @observable.ref errors;

    /**
     * @param params
     * @param params.constraints {Object} The validate.js constraints configuration object. @see https://validatejs.org/#constraints
     * @param params.model {Object} The model to validate
     */
    constructor({constraints, model}) {
        this.constraints = constraints;
        this.model = model;

        // Add reactions to validate individual fields on the model when they change
        forOwn(constraints, (fieldConstraint, field) => {
            // It is important to use hasIn here instead of has because the validation model will
            // often be instantiated during construction of the model passed in here, so has or
            // hasOwnProperty will fail most of the time. hasIn or the in operator will return true
            // since the fields exist on the prototype.
            if (!hasIn(model, field)) {
                console.warn(
                    `ValidationModel has constraint for field '${field}' which is not present in the model: `,
                    model,
                    'constraint: ',
                    fieldConstraint
                );
                return;
            }

            this.addReaction({
                track: () => model[field],
                run: () => this.validateFieldAsync(field)
            });
        });
    }

    /**
     * Checks whether a field is valid in the current validation state.
     *
     * @param field The field to check
     * @returns {boolean} True if the field is valid, false otherwise
     */
    isFieldValid(field) {
        return !has(this.errors, field);
    }

    /**
     * Returns all validation error messages in a flat list
     * @returns {Array} array of error message strings
     */
    get allErrorMessages() {
        return flatten(values(this.errors));
    }

    /**
     * Returns all validation error messages for the specified fields
     * @param fields {Array|String} the fields to get the error messages for
     * @returns {Array} array of error message string
     */
    getFieldErrors(fields) {
        const {errors} = this;
        if (!errors) return [];

        fields = castArray(fields);
        return flatten(fields.map(field => errors[field] || []));
    }

    /**
     * Validates all fields on the model which have constraints configured.
     *
     * @returns {Promise} A Promise that resolves to an object containing the current validation state
     */
    async validateAsync() {
        return validate.async(this.model, this.constraints)
            .then(() => {
                this.setResult({});
                return {isValid: this.isValid, result: this.errors};
            })
            .catch((errors) => {
                this.setResult({...errors});
                return {isValid: this.isValid, result: this.errors};
            });
    }

    /**
     * Validates a single field on the model against the constraints.
     * Results of this single-field-validation will be merged into the current validation state.
     *
     * @param field the field on the model to validate
     * @returns {Promise} A Promise that resolves to an object containing the current validation state
     */
    async validateFieldAsync(field) {
        if (!has(this.constraints, field)) {
            throw new Error(`No constraint defined for field ${field}. Constraints: `,
                this.constraints);
        }

        return validate.async(this.model, pick(this.constraints, field))
            .then(() => {
                this.setResult(omit(this.errors, field));
                return {isValid: this.isValid, result: this.errors};
            })
            .catch((errors) => {
                this.setResult(assign({}, this.errors, errors));
                return {isValid: this.isValid, result: this.errors};
            });
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------

    @action
    setResult(result) {
        this.errors = result;
        this.isValid = isEmpty(result);
    }
}