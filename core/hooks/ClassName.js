/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import classNames from 'classnames';

/**
 * Concatenate a CSS baseClassName (if defined on component) with any instance-specific
 * className provided via props and optional extra names provided at render-time.
 *
 * Components should call this to produce a combined class list and apply it to their
 * outermost (or otherwise most appropriate) rendered component.
 *
 * @param {String} baseClassName - base class name for the component.
 * @param {Array} props
 * @param {...string} extraClassNames - additional classNames to append.
 *
 * @returns {String[]} - Array of class names appropriate for html className attribute
 */
export function useClassName(baseClassName, props, ...extraClassNames) {
    return classNames(baseClassName, props.className, ...extraClassNames);
}
