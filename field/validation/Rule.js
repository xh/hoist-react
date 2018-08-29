/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {flatten, remove, castArray, isNil} from 'lodash';

/**
 * Immutable object representing a validation rule.
 *
 * This object not typically created directly by applications.
 *
 * Applications will typically specify a collection of configurations for
 * this object when creating a ValidationModel.
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
    async evaluateAsync(validator) {
        const {check, when} = this;
        let ret = null;
        if (!when || when(validator, validator.model)) {
            const promises = check.map(it => this.evalConstraintAsync(it, validator));
            ret = await Promise.all(promises);
            ret = flatten(ret);
            remove(ret, (v) => isNil(v));
            return ret;
        }
        return ret;
    }

    //------------------------------
    // Implementation
    //------------------------------
    async evalConstraintAsync(constraint, validator) {
        return await constraint(validator, validator.model);
    }
}


/**
 * @callback ConstraintCb
 * @param {Validator} validator
 * @param {Object} model
 * @returns {(string|string[] } - String or array of strings describing errors.  null or undefined if rule passes successfully.
 */

/**
 * @callback WhenCb
 * @param {Validator} validator
 * @param {Object} model
 * @returns {boolean} - true if this rule is currently active.
 */