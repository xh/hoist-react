/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import classNames from 'classnames';

/**
 * Generate a string with one or more CSS classes to apply to a component, typically concatenating a
 * standardized baseClassName with any instance-specific className(s) provided via props and any
 * optional / conditional class names determined at render-time.
 *
 * Components should call this to produce a combined class list and apply it to their outermost
 * (or otherwise most appropriate) rendered component.
 *
 * @param {string} baseClassName - base class name for the component.
 * @param {Array} props
 * @param {...string} extraClassNames - additional classNames to append.
 *
 * @returns {String[]} - Array of class names appropriate for html className attribute
 */
export function useClassName(baseClassName, props, ...extraClassNames) {
    return classNames(baseClassName, props.className, ...extraClassNames);
}
