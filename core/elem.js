/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray, isArray, isPlainObject, forOwn} from 'lodash';
import {isReactElement} from '@xh/hoist/utils/ReactUtils';

/**
 * Convenience method for creating React Elements. This method is designed to provide a well-
 * formatted, declarative native javascript approach to configuring Elements and their children. It
 * serves as an alternative to JSX, and is especially useful for code-heavy element trees.  For element
 * trees with a signifigant amount of hypertext, consider JSX instead.
 *
 * An important feature of this method is that elements given a config of `omit=true` will be removed from the
 * element tree, allowing for conditional inclusion of elements in a declarative style.
 *
 * Note, also that property "pre-processing" may be specified by particular components by specifying a static
 * processElemProps() method.
 *
 * Note that if a React Component has a native property that conflicts with the properties described below,
 * it may be specified as native with a '$' prefix (e.g. '$items'). This method will recognize and pass the
 * property appropriately.
 *
 * @param {(Object|string)} type - class that extends Component, or a string representing an HTML element
 * @param {Object} [config] - config props to be applied to the Component
 * @param {(Array|Element|Object|string)} [config.items] - child element(s) specified as React
 *      Elements, raw JS objects, or strings. Elements will be created for any raw objects by
 *      calling a factory as per config.itemSpec (below).
 * @param {(Element|Object|string)} [config.item] - a single child - equivalent to items, offered
 *      for code clarity when only one child is needed.
 * @param {*} [config...props] - any additional props to apply to this element
 * @return ReactElement
 */
export function elem(type, config = {}) {

    const {item, items, omit, ...props} = config;

    // 1) Process props -- omitted element gets marked with dom-safe, unique prop
    if (omit) props.xhOmit = 'true';
    if (type.processElemProps) {
        type.processElemProps(props);
    }

    // 2) Process children -- skip empty and omitted
    let children = castArray(item || items);
    children = children.filter(c => c != null && !(c.props && c.props.xhOmit));

    // 3) Recapture API props that needed '$' prefix to avoid conflicts with above.
    forOwn(props, (val, key) => {
        if (key.startsWith('$')) {
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

