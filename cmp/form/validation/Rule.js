/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {castArray, compact, flatten} from 'lodash';
import {required} from './constraints';

/**
 * Immutable object representing a validation rule.
 */
export class Rule {

    check;
    when;

    /**
     * @param c - Rule configuration.
     * @param {(ConstraintCb|ConstraintCb[])} c.check - function(s) to perform validation.
     * @param {WhenCb} [c.when] - function to determine when this rule is active.
     *      If not specified rule is considered to be always active.
     */
    constructor({check, when}) {
        this.check = castArray(check);
        this.when = when;
    }

    /**
     * Compute current set of errors (if any) for this rule.
     * @param {FieldModel} field - field being evaluated.
     * @returns {Promise<string[]>}
     */
    async evaluateAsync(field) {
        if (this.isActive(field)) {
            const promises = this.check.map(it => this.evalConstraintAsync(it, field));
            const ret = await Promise.all(promises);
            return compact(flatten(ret));
        }
        return [];
    }

    /**
     * True if this rule is active and indicates that a value is required.
     */
    requiresValue(field) {
        return this.isActive(field) && this.check.includes(required);
    }

    //------------------------------
    // Implementation
    //------------------------------
    isActive(field) {
        if (!field.formModel) return false;
        const {when} = this;
        return !when || when(field, field.formModel.values);
    }

    async evalConstraintAsync(constraint, field) {
        return await constraint(field, field.formModel.values);
    }
}


/**
 * @callback ConstraintCb
 * @param {FieldModel} fieldModel
 * @param {Object} map of values for all fields in form
 * @returns {(string|string[])} - String or array of strings describing errors,
 *      or null or undefined if rule passes successfully.
 */

/**
 * @callback WhenCb
 * @param {FieldModel} fieldModel
 * @param {Object} map of values for all fields in form
 * @returns {boolean} - true if this rule is currently active.
 */
