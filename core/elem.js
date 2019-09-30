/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React, {isValidElement} from 'react';
import {castArray, isArray, isPlainObject} from 'lodash';

/**
 * Convenience method for creating React Elements. This method is designed to provide a well-
 * formatted, declarative, native javascript approach to configuring Elements and their children.
 * It serves as an alternative to JSX and is especially useful for code-heavy element trees.
 * (For element trees with a significant amount of hypertext, JSX could be a better choice.)
 *
 * This function is a *very* thin layer around `React.createElement()`. The core enhancement is that
 * it expects child elements and props to be specified in a single bundle, with children placed
 * within an `item` or `items` key. This allows developers to write declarative, multi-level element
 * trees in a concise yet highly-readable style.
 *
 * An additional minor-but-useful feature is support for an `omit` config, which allows element
 * subtrees to be declaratively excluded from rendering if a given condition is met.
 *
 * Note that if a React Component has its own property of `item`, `items`, or `omit`, the property
 * must be specified with a `$` prefix (e.g. `$item`) to avoid conflicting with the elem() API.
 *
 * @param {(Object|string)} type - class extending Component or string representing an HTML element.
 * @param {Object} [config] - Element configuration.
 * @param {(Array|Element|string)} [config.items] - child Element(s).
 * @param {(Element|string)} [config.item] - equivalent to `items`, offered for code clarity when
 *      only one child is needed.
 * @param {boolean} [config.omit] - true to exclude the Element by returning null.
 * @param {*} [config ...props] - props to apply to the Element.
 * @return ReactElement
 */
export function elem(type, config = {}) {

    const {omit, item, items, ...props} = config;

    // 1) Convenience omission syntax.
    if (omit) return null;

    // 2) Read children from item[s] config.
    const itemConfig = item || items,
        children = (itemConfig === undefined ? [] : castArray(itemConfig));

    // 3) Recapture API props that needed '$' prefix to avoid conflicts.
    ['$omit', '$item', '$items'].forEach(key => {
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
 * One critical enhancement provided by this factory is that its arguments may be *either* a single
 * config for elem() or either an array or rest arguments representing just the the children to be
 * passed to the new Element. This latter case is fully equivalent to specifying `{items: [...]}`
 * and is useful when no attributes need to be applied directly to the Element.

 * @param {(Object|string)} type - class extending Component or string representing an HTML element
 *      for which this factory will create Elements.
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
        if (isPlainObject(arg) && !isValidElement(arg)) return arg;
        if (isArray(arg)) return {items: arg};
    }
    // Assume > 1 args or single, non-config, non-array args are children.
    return {items: args};
}

