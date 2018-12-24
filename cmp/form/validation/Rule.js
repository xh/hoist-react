/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {flatten, remove, castArray, isNil} from 'lodash';
import {required} from './constraints';

/**
 * Immutable object representing a validation rule.
 *
 * This object not typically created directly by applications.
 *
 * Applications will typically specify rule configurations to the field
 * via the field decorator or FieldModel.addRule();
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
     * Compute current set of errors (if any) for this rule
     */
    async evaluateAsync(field) {
        const {check} = this;
        let ret = [];
        if (this.isActive(field)) {
            const promises = check.map(it => this.evalConstraintAsync(it, field));
            ret = await Promise.all(promises);
            ret = flatten(ret);
            remove(ret, (v) => isNil(v));
            return ret;
        }
        return ret;
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
        return !when || when(field, field.formModel.dataProxy);
    }

    async evalConstraintAsync(constraint, field) {
        return await constraint(field, field.formModel.dataProxy);
    }
}


/**
 * @callback ConstraintCb
 * @param {FieldModel} fieldModel
 * @param {Object} model
 * @returns {(string|string[])} - String or array of strings describing errors,
 *      or null or undefined if rule passes successfully.
 */

/**
 * @callback WhenCb
 * @param {FieldModel} fieldModel
 * @param {Object} model
 * @returns {boolean} - true if this rule is currently active.
 */