/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {formatDate} from '@xh/format';

/**
 * Validate the presence of a field.
 */
export const required = ({value, displayName}) => {
    if (isNil(value)) return `${displayName} is required.`;
};

/**
 * Validate that a string in not blank
 */
export const notBlank = ({value, displayName}) => {
    if (isNil(value)) return null;

    if (value.trim().length == 0) return `${displayName} must not be blank.`
}

/**
 * Validate length of a string.
 */
export function lengthIs({min, max}) {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (min != null && value.length < min) return `${displayName} must contain at least ${min} characters`;
        if (max != null && value.length > max) return `${displayName} must contain no more than ${max} characters.`;
    };
}

/**
 * Validate a number.
 */
export function numberIs({min, max}) {
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (min != null && value < min) return `${displayName} must be greater than or equal to ${min}.`;
        if (max != null && value > max) return `${displayName} must be less than or equal to ${max}.`;
    };
}

/**
 * Validate a date.
 */
export function dateIs({min, max, fmt = 'YYYY-MM-DD'}){
    return ({value, displayName}) => {
        if (isNil(value)) return null;

        if (min != null && value < min) return `${displayName} must not be before ${formatDate(min, {fmt})}.`;
        if (max != null && value > max) return `${displayName} must not be after ${formatDate(max, {fmt})}.`;
    }
}