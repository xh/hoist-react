/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {castArray} from 'lodash';

/**
 * Abstract Base class for validation Rules.
 *
 * @see FormFieldRule
 * @see StoreFieldRule
 */
export class BaseRule {

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
}

/**
 * @callback ConstraintCb
 * @param {FieldState} FieldState
 * @param {Object} map of values for all fields in form
 * @returns {(string|string[])} - String or array of strings describing errors,
 *      or null or undefined if rule passes successfully.
 */

/**
 * @callback WhenCb
 * @param {FieldState} FieldState
 * @param {Object} map of values for all fields in form
 * @returns {boolean} - true if this rule is currently active.
 */

/**
 * @typedef {Object} FieldState
 * @property {*} value - current value of the field
 * @property {string} displayName - Display name of the Field
 */