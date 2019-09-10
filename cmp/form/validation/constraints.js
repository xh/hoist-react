/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {isEmpty, isNil, isString, isArray} from 'lodash';
import {isLocalDate} from '@xh/hoist/utils/datetime';

import moment from 'moment';
/**
 * A set of validation functions to assist in form field validation.
 */

/**
 * Validate that a value is not null or undefined.
 * For strings this validation will fail if empty or containing only whitespace.
 * For arrays (e.g. Select w/multiple values) this validation will fail if empty.
 *
 * @type ConstraintCb
 */
export const required = ({value, displayName}) => {
    if (
        isNil(value) ||
        (isString(value) && value.trim().length == 0) ||
        (isArray(value) && value.length == 0)
    ) return `${displayName} is required.`;
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
 * Validate a date or LocalDate against allowed min/max boundaries.
 *
 * @param {Object} c
 * @param {(Date|LocalDate|string)} [c.min] - earliest allowed value for the date to be checked.
 *      Supports strings 'now' (instant rule is run) and 'today' (any time on the current day).
 * @param {(Date|LocalDate|string)} [c.max] - latest allowed value for the date to be checked.
 *      Supports strings 'now' (instant rule in run) and 'today' (any time on the current day).
 * @param {string} [c.fmt] - custom date format to be used in validation message.
 * @returns ConstraintCb
 */
export function dateIs({min, max, fmt = 'YYYY-MM-DD'}) {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (isLocalDate(value)) value = value.moment;

        let minMoment = null;
        if (min === 'now') {
            minMoment = moment();
        } else if (min === 'today') {
            minMoment = moment().startOf('day');
        } else if (isLocalDate(min)) {
            minMoment = min.moment;
        } else if (min) {
            minMoment = moment(min);
        }

        let maxMoment = null;
        if (max === 'now') {
            maxMoment = moment();
        } else if (max === 'today') {
            maxMoment = moment().endOf('day');
        } else if (isLocalDate(max)) {
            maxMoment = max.moment;
        } else if (max) {
            maxMoment = moment(max);
        }

        if (minMoment && minMoment.isAfter(value)) return `${displayName} must not be before ${minMoment.format(fmt)}.`;
        if (maxMoment && maxMoment.isBefore(value)) return `${displayName} must not be after ${maxMoment.format(fmt)}.`;
    };
}

/**
* Apply a constraint to an array of values, e.g values coming from a tag picker.
*
* @param {function()} the executed constraint function to use on the array of values
* @returns ConstraintCb
*/
export function constrainAll(constraint) {
    return ({values, displayName}) => {
        if (isNil(values) || isEmpty(values)) return null;
        
        for (let value in values) {
            const fail = constraint({value, displayName});
            if (fail) return fail;
        }
       
        return null;
    };
}

/**
* Validate that a value does not contain specific strings or characters.
*
* @param {...string} excludeVals - one or more strings to exclude
* @returns ConstraintCb
*/
export function stringExcludes(...excludeVals) {
    return ({value, displayName}) => {
        if (isNil(value)) return null;
        const fail = excludeVals.find(s => value.includes(s));
        if (fail) return `${displayName} must not include "${fail}"`;
    };
}
