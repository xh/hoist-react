/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {isArray, isEmpty, isFinite, isNil, isString} from 'lodash';
import moment from 'moment';
import {ConstraintCb} from './Rule';
/**
 * A set of validation functions to assist in form field validation.
 */

/**
 * Validate that a value is not null or undefined.
 * For strings this validation will fail if empty or containing only whitespace.
 * For arrays (e.g. Select w/multiple values) this validation will fail if empty.
 */
export const required: ConstraintCb = ({value, displayName}, foo) => {
    if (
        isNil(value) ||
        (isString(value) && value.trim().length === 0) ||
        (isArray(value) && value.length === 0)
    ) return `${displayName} is required.`;
};

/**
 * Validate an email address.
 * https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript/46181#46181.
 */
export const validEmail: ConstraintCb = ({value, displayName}) => {
    if (isNil(value)) return null;

    // eslint-disable-next-line no-useless-escape
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        isValid = re.test(value);
    if (!isValid) return `${displayName} is not a properly formatted address.`;
};

/**
 * Validate length of a string.
 */
export function lengthIs(c: {min?: number, max?: number}): ConstraintCb {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        const {min, max} = c;
        if (min != null && value.length < min) return `${displayName} must contain at least ${min} characters.`;
        if (max != null && value.length > max) return `${displayName} must contain no more than ${max} characters.`;
    };
}

/**
 * Validate a number.
 *
 * @param [c.min] - minimum value (value must be gte)
 * @param [c.max] - maximum value (value must be lte)
 * @param [c.gt] - greater than
 * @param [c.lt] - less than
 * @param [c.notZero] - true to disallow 0.
 */
export function numberIs(
    c: {min?: number, max?: number, gt?: number, lt?: number, notZero?: boolean}
): ConstraintCb {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        const {min, max, gt, lt, notZero} = c;
        if (notZero && value === 0) return `${displayName} must not be zero.`;
        if (isFinite(min) && value < min) return `${displayName} must be greater than or equal to ${min}.`;
        if (isFinite(max) && value > max) return `${displayName} must be less than or equal to ${max}.`;
        if (isFinite(gt) && value <= gt) return `${displayName} must be greater than ${gt}.`;
        if (isFinite(lt) && value >= lt) return `${displayName} must be less than ${lt}.`;
    };
}

/**
 * Validate a date or LocalDate against allowed min/max boundaries.
 *
 * @param [c.min] - earliest allowed value for the date to be checked.
 *      Supports strings 'now' (instant rule is run) and 'today' (any time on the current day).
 * @param [c.max] - latest allowed value for the date to be checked.
 *      Supports strings 'now' (instant rule is run) and 'today' (any time on the current day).
 * @param [c.fmt] - custom date format to be used in validation message.
 */
export function dateIs(c: {
    min?: Date|LocalDate|'now'|'today',
    max?: Date|LocalDate|'now'|'today',
    fmt?: string
}): ConstraintCb {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (isLocalDate(value)) value = value.moment;

        const {min, max, fmt = 'YYYY-MM-DD'} = c;
        let minMoment = null;
        if (min === 'now') {
            minMoment = moment();
        } else if (min === 'today') {
            minMoment = moment().startOf('day');
        } else if (min instanceof LocalDate) {
            minMoment = min.moment;
        } else if (min) {
            minMoment = moment(min);
        }

        let maxMoment = null;
        if (max === 'now') {
            maxMoment = moment();
        } else if (max === 'today') {
            maxMoment = moment().endOf('day');
        } else if (max instanceof LocalDate) {
            maxMoment = max.moment;
        } else if (max) {
            maxMoment = moment(max);
        }

        let error = null;
        if (minMoment?.isAfter(value)) {
            switch (min) {
                case 'now': error = 'in the past.'; break;
                case 'today': error = 'before today.'; break;
                default: error = `before ${minMoment.format(fmt)}`;
            }
        } else if (maxMoment?.isBefore(value)) {
            switch (max) {
                case 'now': error = 'in the future.'; break;
                case 'today': error = 'after today.'; break;
                default: error = `after ${maxMoment.format(fmt)}`;
            }
        }
        return error ? `${displayName} must not be ${error}` : null;
    };
}

/**
* Apply a constraint to an array of values, e.g values coming from a tag picker.
*
* @param {function} constraint - the executed constraint function to use on the array of values
*/
// TODO: What is this type?
export function constrainAll(constraint: any): any {
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
* @param excludeVals - one or more strings to exclude
*/
export function stringExcludes(...excludeVals: string[]): ConstraintCb {
    return ({value, displayName}) => {
        if (isNil(value)) return null;
        const fail = excludeVals.find(s => value.includes(s));
        if (fail) return `${displayName} must not include "${fail}"`;
    };
}

/**
 * Validate that a value is JSON
 */
export const isValidJson: ConstraintCb = ({value, displayName}) => {
    try {
        JSON.parse(value);
    } catch {
        return `${displayName} is not valid JSON`;
    }
};