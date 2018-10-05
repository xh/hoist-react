/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fmtDate} from '@xh/hoist/format';
import {isNil, isString} from 'lodash';
/**
 * A set of validation functions to assist in form field validation
 */


/**
 * Validate the presence of a field.
 * @param value - value to be checked. String values must also not be empty, or all spaces.
 * @param displayName - display field name to be used in return validation message
 */
export const required = ({value, displayName}) => {
    if (isNil(value) || (isString(value) && value.trim().length == 0)) return `${displayName} is required.`;
};

/**
 * Validate length of a string.
 * @param {null | number} min - minimum length for the string to be checked. Null skips check
 * @param {null | number} max - maximum length for the string to be checked. Null skips check
 * @returns lengthIs~function
 */
export function lengthIs({min, max}) {
    /**
     * @param value - value to be checked
     * @param displayName - display field name to be used in return validation message
     */
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (min != null && value.length < min) return `${displayName} must contain at least ${min} characters.`;
        if (max != null && value.length > max) return `${displayName} must contain no more than ${max} characters.`;
    };
}

/**
 * Validate a number.
 * @param {null | number} min - minimum value for the number to be checked. Null skips check
 * @param {null | number} max - maximum value for the number to be checked. Null skips check
 * @param {boolean} notZero - checks for whether '0' is allowed
 * @returns numberIs~function
 */
export function numberIs({min, max, notZero}) {
    /**
     * @param value - value to be checked
     * @param displayName - display field name to be used in return validation message
     */
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (notZero && value === 0) return `${displayName} must not be zero.`;
        if (min != null && value < min) return `${displayName} must be greater than or equal to ${min}.`;
        if (max != null && value > max) return `${displayName} must be less than or equal to ${max}.`;
    };
}

/**
 * Validate a date.
 * @param {null | Date} min - minimum date allowed for the field. Null skips check
 * @param {null | Date} max - maximum date allowed for the field. Null skips check
 * @param {string} [fmt='YYYY-MM-DD'] - optional date format string used in validation message
 * @returns dateIs~function
 */
export function dateIs({min, max, fmt = 'YYYY-MM-DD'}) {
    /**
     * @param value - value to be checked
     * @param displayName - display field name to be used in return validation message
     */
    return ({value, displayName}) => {
        min = min === 'now' ? new Date() : min;
        max = max === 'now' ? new Date() : max;

        if (isNil(value)) return null;

        if (min != null && value < min) return `${displayName} must not be before ${fmtDate(min, {fmt})}.`;
        if (max != null && value > max) return `${displayName} must not be after ${fmtDate(max, {fmt})}.`;
    };
}