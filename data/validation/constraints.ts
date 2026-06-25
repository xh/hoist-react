/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Constraint} from '@xh/hoist/data';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {pluralize} from '@xh/hoist/utils/js';
import {isArray, isEmpty, isFinite, isNil, isString, uniq} from 'lodash';
import moment from 'moment';

/**
 * A set of validation functions to assist in form field validation.
 */

/**
 * Validate that a value is not null or undefined.
 * For strings this validation will fail if empty or containing only whitespace.
 * For arrays (e.g. Select w/multiple values) this validation will fail if empty.
 */
export const required: Constraint = ({value, displayName}) => {
    if (
        isNil(value) ||
        (isString(value) && value.trim().length === 0) ||
        (isArray(value) && value.length === 0)
    )
        return `${displayName} is required.`;
};

/**
 * Validate a single email address in a field that expects only one email address.
 */
export const validEmail: Constraint<string> = ({value, displayName}) => {
    if (isNil(value)) return null;

    const isValid = emailRegEx.test(value);
    if (!isValid) return `${displayName} is not a properly formatted email address.`;
};

/**
 * Validate all email addresses in a field that allows multiple email addresses
 * separated by a semicolon - the separator used by Outlook for multiple email addresses.
 * All email addresses must be unique.
 */
export function validEmails(c?: ValidEmailsOptions): Constraint<string> {
    return ({value, displayName}) => {
        if (isNil(value) && !c?.minCount) return null;

        const emails = (value ?? '')
            .split(';')
            .map(it => it.trim())
            .filter(Boolean);

        if (uniq(emails).length !== emails.length) {
            return `${displayName} must not contain duplicate emails.`;
        }
        if (emails.length < c?.minCount) {
            return `${displayName} must contain at least ${c.minCount} ${pluralize('email', c.minCount)}.`;
        }
        if (!isNil(c?.maxCount) && emails.length > c.maxCount) {
            return `${displayName} must contain no more than ${c.maxCount} ${pluralize('email', c.maxCount)}.`;
        }

        const isValid = emails.every(it => emailRegEx.test(it));

        if (!isValid) return `${displayName} has an improperly formatted email address.`;
    };
}
export interface ValidEmailsOptions {
    /** Require at least N email addresses. */
    minCount?: number;

    /** Require no more than N email addresses. */
    maxCount?: number;
}

/** Validate length of a string.*/
export function lengthIs(c: LengthIsOptions): Constraint<string> {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        const {min, max} = c;
        if (min != null && value.length < min)
            return `${displayName} must contain at least ${min} characters.`;
        if (max != null && value.length > max)
            return `${displayName} must contain no more than ${max} characters.`;
    };
}
export interface LengthIsOptions {
    min?: number;
    max?: number;
}

/** Validate amount of a number */
export function numberIs(c: NumberIsOptions): Constraint<number> {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        const {min, max, gt, lt, notZero} = c;
        if (notZero && value === 0) return `${displayName} must not be zero.`;
        if (isFinite(min) && value < min)
            return `${displayName} must be greater than or equal to ${min}.`;
        if (isFinite(max) && value > max)
            return `${displayName} must be less than or equal to ${max}.`;
        if (isFinite(gt) && value <= gt) return `${displayName} must be greater than ${gt}.`;
        if (isFinite(lt) && value >= lt) return `${displayName} must be less than ${lt}.`;
    };
}
export interface NumberIsOptions {
    /** Minimum value (value must be gte).*/
    min?: number;
    /** Maximum value (value must be lte).*/
    max?: number;
    gt?: number;
    lt?: number;
    /** True to disallow 0. */
    notZero?: boolean;
}

/** Validate a date or LocalDate against allowed min/max boundaries. */
export function dateIs(c: DateIsOptions): Constraint<Date | LocalDate> {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        let val = value as any;
        if (val instanceof LocalDate) val = val.moment;

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
        if (minMoment?.isAfter(val)) {
            switch (min) {
                case 'now':
                    error = 'in the past.';
                    break;
                case 'today':
                    error = 'before today.';
                    break;
                default:
                    error = `before ${minMoment.format(fmt)}`;
            }
        } else if (maxMoment?.isBefore(val)) {
            switch (max) {
                case 'now':
                    error = 'in the future.';
                    break;
                case 'today':
                    error = 'after today.';
                    break;
                default:
                    error = `after ${maxMoment.format(fmt)}`;
            }
        }
        return error ? `${displayName} must not be ${error}` : null;
    };
}

export interface DateIsOptions {
    /**
     * Earliest allowed value for the date to be checked.
     * Supports values 'now' (instant rule is run) and 'today' (any time on the current day).
     */
    min?: Date | LocalDate | 'now' | 'today';
    /**
     * Latest allowed value for the date to be checked.
     * Supports values 'now' (instant rule is run) and 'today' (any time on the current day).
     */
    max?: Date | LocalDate | 'now' | 'today';
    /** Custom date format to be used in validation message. */
    fmt?: string;
}

/**
 * Apply a constraint to an array of values, e.g values coming from a tag picker.
 *
 * @param constraint - the executed constraint function to use on each individual value.
 * @returns a constraint appropriate for an array of values.
 */
export function constrainAll<T>(constraint: Constraint<T>): Constraint<T[]> {
    return (fieldState, map) => {
        const {value} = fieldState;
        if (!isArray(value) || isNil(value) || isEmpty(value)) return null;

        for (let v of value) {
            const fail = constraint({...fieldState, value: v}, map);
            if (fail) return fail;
        }

        return null;
    };
}

/**
 * Validate that a value does not contain specific strings or characters.
 * @param excludeVals - one or more strings to exclude
 */
export function stringExcludes(...excludeVals: string[]): Constraint<string> {
    return ({value, displayName}) => {
        if (isNil(value)) return null;
        const fail = excludeVals.find(s => value.includes(s));
        if (fail) return `${displayName} must not include "${fail}"`;
    };
}

/** Validate that a value is JSON. */
export const isValidJson: Constraint = ({value, displayName}) => {
    try {
        JSON.parse(value);
    } catch {
        return `${displayName} is not valid JSON`;
    }
};

// https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript/46181#46181
// prettier-ignore
// eslint-disable-next-line no-useless-escape
const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
