/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {formatDate} from '@xh/hoist/format';
import {isNil} from 'lodash';

/**
 * Validate the presence of a field.
 */
export const required = ({value, fieldName}) => {
    if (isNil(value)) return `${fieldName} is required.`;
};

/**
 * Validate that a string in not blank
 */
export const notBlank = ({value, fieldName}) => {
    if (isNil(value)) return null;

    if (value.trim().length == 0) return `${fieldName} must not be blank.`;
};

/**
 * Validate length of a string.
 */
export function isLength({min, max}) {
    return ({value, fieldName}) => {
        if (isNil(value)) return null;

        if (min != null && value.length < min) return `${fieldName} must contain at least ${min} characters.`;
        if (max != null && value.length > max) return `${fieldName} must contain no more than ${max} characters.`;
    };
}

/**
 * Validate a number.
 */
export function isNumber({min, max}) {
    return ({value, fieldName}) => {
        if (isNil(value)) return null;

        if (min != null && value < min) return `${fieldName} must be greater than or equal to ${min}.`;
        if (max != null && value > max) return `${fieldName} must be less than or equal to ${max}.`;
    };
}

/**
 * Validate a date.
 */
export function isDate({min, max, fmt = 'YYYY-MM-DD'}) {
    return ({value, fieldName}) => {
        if (isNil(value)) return null;

        if (min != null && value < min) return `${fieldName} must not be before ${formatDate(min, {fmt})}.`;
        if (max != null && value > max) return `${fieldName} must not be after ${formatDate(max, {fmt})}.`;
    };
}