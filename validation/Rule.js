/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {flatten, without, castArray, isNil} from 'lodash';

/**
 * Immutable object representing a validation rule.
 *
 * This object not typically created directly by applications.
 *
 * Applications will typically specify a collection of configurations for
 * this object when creating a ValidationModel.
 */
export class Rule {

    checks;
    when;

    /**
     *  @param {(CheckCb[] | CheckCb)} cfg.checks - functions to perform validation.
     *  @param {WhenCb} [cfg.when] - optional function to determine when this rule is active.
     *      If not specified rule is considered to be always active.
     */
    constructor({checks, when}) {
        this.checks = castArray(checks);
        this.when = when;
    }

    /**
     * Compute current set of errors for this rule, or null if rule fully passes.
     */
    async evaluateAsync(validator) {
        const {checks, when} = this;
        let ret = null;
        if (!when || when(validator, validator.model)) {
            const promises = checks.map(it => this.evalCheckAsync(it, validator));
            ret = await Promise.all(promises);
            ret = flatten(without(ret, isNil));
            ret = ret.length ? ret : null;
        }
        return ret;
    }

    //------------------------------
    // Implementation
    //------------------------------
    async evalCheckAsync(check, validator) {
        return await check(validator, validator.model);
    }
}


/**
 * @callback CheckCb
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