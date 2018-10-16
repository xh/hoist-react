/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fmtDate} from '@xh/hoist/format';
import {isNil, isString} from 'lodash';
/**
 * A set of validation functions to assist in form field validation.
 */

/**
 * Validate that a value is not null or undefined.
 * For strings this validation will also fail empty strings, or strings with blanks only.
 *
 * @type ConstraintCb
 */
export const required = ({value, displayName}) => {
    if (isNil(value) || (isString(value) && value.trim().length == 0)) return `${displayName} is required.`;
};


/**
 * Validate length of a string.
 * @param {Object} c
 * @param {number} [c.min] - minimum length for the string to be checked.
 * @param {number} [c.max] - maximum length for the string to be checked.
 * @returns ConstraintCb
 */
export function lengthIs({min, max}) {

    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (min != null && value.length < min) return `${displayName} must contain at least ${min} characters.`;
        if (max != null && value.length > max) return `${displayName} must contain no more than ${max} characters.`;
    };
}

/**
 * Validate a number.
 *
 * @param {Object} c
 * @param {number} [c.min] - minimum value for the number to be checked.
 * @param {number} [c.max] - maximum value for the number to be checked.
 * @param {boolean} [c.notZero] - true to disallow 0.
 * @returns ConstraintCb
 */
export function numberIs({min, max, notZero}) {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (notZero && value === 0) return `${displayName} must not be zero.`;
        if (min != null && value < min) return `${displayName} must be greater than or equal to ${min}.`;
        if (max != null && value > max) return `${displayName} must be less than or equal to ${max}.`;
    };
}

/**
 * Validate a date.
 *
 * @param {Object} c
 * @param {(Date|string)} [c.min] - earliest value for the date to be checked.  Also supports string 'now'.
 * @param {(Date|string)} [c.max] - latest value for the date to be checked.  Also supports string 'now'.
 * @param {string} [c.fmt] - custom date format to be used in validation message.
 * @returns ConstraintCb
 */
export function dateIs({min, max, fmt = 'YYYY-MM-DD'}) {
    return ({value, displayName}) => {
        min = min === 'now' ? new Date() : min;
        max = max === 'now' ? new Date() : max;

        if (isNil(value)) return null;

        if (min != null && value < min) return `${displayName} must not be before ${fmtDate(min, {fmt})}.`;
        if (max != null && value > max) return `${displayName} must not be after ${fmtDate(max, {fmt})}.`;
    };
}