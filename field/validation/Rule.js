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
     *  @param {(ConstraintsCb[] | ConstraintCb)} cfg.check - function(s) to perform validation.
     *  @param {WhenCb} [cfg.when] - optional function to determine when this rule is active.
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
        const {check, when} = this;
        let ret = null;
        if (!when || when(field, field.model)) {
            const promises = check.map(it => this.evalConstraintAsync(it, field));
            ret = await Promise.all(promises);
            ret = flatten(ret);
            remove(ret, (v) => isNil(v));
            return ret;
        }
        return ret;
    }

    /**
     * Is this rule active and indicating that a value is required?
     */
    requiresValue(field) {
        return this.isActive(field) && this.check.includes(required);
    }

    //------------------------------
    // Implementation
    //------------------------------
    isActive(field) {
        const {when} = this;
        return !when || when(field, field.model);
    }

    async evalConstraintAsync(constraint, field) {
        return await constraint(field, field.model);
    }
}


/**
 * @callback ConstraintCb
 * @param {FieldModel} fieldModel
 * @param {Object} model
 * @returns {(string|string[]} - String or array of strings describing errors.  null or undefined if rule passes successfully.
 */

/**
 * @callback WhenCb
 * @param {FieldModel} fieldModel
 * @param {Object} model
 * @returns {boolean} - true if this rule is currently active.
 */