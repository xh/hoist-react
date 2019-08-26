/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import classNames from 'classnames';

/**
 * Generate a string with one or more CSS classes to apply to a component, typically concatenating a
 * standardized base className with any instance-specific getClassName(s) provided via props and any
 * optional / conditional class names determined at render-time.
 *
 * Components should call this to produce a combined class list and apply it to their outermost
 * (or otherwise most appropriate) rendered component.
 *
 * @param {string} baseName - base class name for the component.
 * @param {Array} props - component props
 * @param {String[]} [extraNames] - optional, additional class names to append.
 *
 * @returns {string} - Concatenated space-delimited class name appropriate for html className attribute
 */
export function getClassName(baseName, props, ...extraNames) {
    return classNames(baseName, props.className, ...extraNames);
}
