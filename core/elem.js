/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray, isArray, isPlainObject} from 'lodash';
import {isReactElement} from '@xh/hoist/utils/react';

/**
 * Convenience method for creating React Elements. This method is designed to provide a well-
 * formatted, declarative native javascript approach to configuring Elements and their children. It
 * serves as an alternative to JSX, and is especially useful for code-heavy element trees.  For element
 * trees with a signifigant amount of hypertext, consider JSX instead.
 *
 * This function is a *very* thin layer around React.createElement().  The core enhancement is that child
 * elements and props are specified in a single bundle, with children placed within an 'item' or 'items'
 * key.  This allows a highly readable style for creating declarative element trees.
 *
 * An additional minor, but highly useful feature is support for an 'omit' key, which allows element
 * subtrees to be excluded declaratively as well.
 *
 * Note that if a React Component has its own property of 'item', 'items', or 'omit', the property may be
 * specified with a '$' prefix (e.g. '$item') to avoid conflicting with the elem() api.
 *
 * @param {(Object|string)} type - class that extends Component, or a string representing an HTML element
 * @param {Object} [config] - config to create the react element.
 * @param {(Array|Element|string)} [config.items] - child element(s).
 * @param {(Element|string)} [config.item] - a single child - equivalent to items, offered
 *      for code clarity when only one child is needed.
 * @param {boolean} [config.omit] - true to exclude the element, by returning null from this function.
 * @param {*} [config ...props] - any props to apply to this element
 * @return ReactElement
 */
export function elem(type, config = {}) {

    const {item, items, omit, ...props} = config;

    // 1) Convenience omission syntax
    if (omit) return null;

    // 2) Capture children
    const children = castArray(item || items).filter(c => c != null);

    // 3) Recapture API props that needed '$' prefix to avoid conflicts.
    ['$omit', '$item', '$items'] .forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props[key];
        }
    });

    return React.createElement(type, props, ...children);
}


/**
 * Returns a factory function that can create a ReactElement using native JS (i.e. not JSX).
 * This is a 'curried' version of the raw elem() method.
 *
 * One critical enhancement provided by this factory is that its arguments may be *either* a single config for elem(),
 * or alternatively, an array or rest argument representing just the the children to be passed to the new Element.
 * This latter case is fully equivalent to specifying `{items: [,]}` and is useful when no attributes need to be
 * applied directly to the Element.

 * @param {(Object|string)} type - class that extends Component - or a string representing an HTML
 *      element - for which this factory will create Elements.
 * @return {function}
 */
export function elemFactory(type) {
    return function(...args) {
        return elem(type, normalizeArgs(args));
    };
}

//------------------------
// Implementation
//------------------------
function normalizeArgs(args) {
    const len = args.length;
    if (len === 0) return {};
    if (len === 1) {
        const arg = args[0];
        if (isPlainObject(arg) && !isReactElement(arg)) return arg;
        if (isArray(arg)) return {items: arg};
    }
    // Assume > 1 args or single, non-config, non-array args are children.
    return {items: args};
}

