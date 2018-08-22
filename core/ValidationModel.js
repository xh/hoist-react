/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {validate} from 'validate.js/validate.js';
import {
    has,
    hasIn,
    pick,
    omit,
    isEmpty,
    forOwn,
    values,
    flatten,
    castArray,
    keys,
    defaults
} from 'lodash';
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

    @observable.ref _errors = {};

    asyncModel = new PendingTaskModel({mode: 'all'});

    get state() {
        if (this.asyncModel.isPending) {
            return ValidationModelState.PENDING;
        }

        return isEmpty(this._errors) ? ValidationModelState.VALID : ValidationModelState.INVALID;
    }

    get isValid() {
        return this.state === 'valid';
    }

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

            // TODO: warnIf!
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
                run: () => this.validateAsync(field)
            });
        });

        this.validateAsync();
    }

    /**
     * Check field validity
     *
     * @param field - The field to check
     * @returns {boolean}
     */
    isFieldValid(field) {
        return !has(this._errors, field);
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
            return flatten(fields.map(field => this._errors[field] || []));
        }

        return flatten(values(this._errors));
    }

    //---------------------------------------------
    // Implementation (internal)
    //---------------------------------------------

    async validateAsync(fields) {
        const {constraints, asyncModel, model} = this;

        if (!fields) {
            fields = keys(constraints);
        } else {
            fields = castArray(fields);
        }

        return validate.async(model, pick(constraints, fields))
            .then(() => {
                this.setErrors(omit(this._errors, fields));
            })
            .catch((errors) => {

                fields.forEach(field => {
                    if (!has(errors, field)) {
                        delete this._errors[field];
                    }
                });

                this.setErrors(defaults(errors, this._errors));
            })
            .linkTo(asyncModel);
    }

    @action
    setErrors(errors) {
        this._errors = errors;
    }
}