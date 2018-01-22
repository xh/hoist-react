/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {asArray} from 'hoist/utils/JsUtils';
import {defaults, isPlainObject, isString} from 'lodash';
import React from 'react';
//------------------------------------------
// Factory generator, and default factories
//------------------------------------------
/**
 * Convenience method for creating React Elements with native javascript.  This method is designed
 * to provide a well-formatted, declarative native javascript alternative to JSX.
 *
 * @param type, string representing html element, or React Component
 * @param args, additional arguments to populate the component.
 *
 * args can take one of the following two forms:
 *
 * 1) a single config object with the following structure:
 *      {
 *              cls: String, css classes for this element  (alias for React 'className')
 *
 *              items: single or array of child elements.  These may be specified as React Elements, or raw js objects
 *                      If specified as objects, elements will be created for them by calling a factory method on each
 *                      object. The creation of child items in this way will be governed by itemSpec.
 *
 *              itemSpec: factory, or object of the following form:
 *                      {
 *                          factory: factory to be used for creating child elements, if none specified.
 *                          preCls: additional css classes to be prepended to child css className
 *                          postCls: additional css classes to be postpended to child css className.
 *                          ...props: other properties to serve as defaults for children.
 *                      }
 *
 *               ...props:  other properties to apply to this element
 *        }
 *
 *  OR
 *
 *  2) a series of children objects to be directly passed to the new element.  Equivalent
 *  to {items: args}.  Useful when no attributes need to be applied directly to the Element.
 */
export function elem(type, ...args) {

    // 0) Normalize args into well-specified configs.
    let {items, itemSpec, cls, ...props} = normalizeArgs(args);
    items = asArray(items);

    // 1) Handle basic renames
    if (cls) props.className = cls;

    // 2) Special handling for 'items' (must use $items for an 'items' API property)
    if (props.$items) props.items = props.$items;

    // 3) process children with itemSpecs
    itemSpec = isPlainObject(itemSpec) ? itemSpec : {factory: itemSpec};
    const {factory, preCls, postCls, ...defaultParams} = itemSpec;
    items = items
        .filter(item => !!item)
        .map(item => {
            if (item.$$typeof || isString(item)) {
                return item;
            } else {
                const fct = item.factory || factory || defaultChildFactory;
                if (preCls) {
                    item.cls = item.cls ? `${preCls} ${item.cls}` : preCls;
                }
                if (postCls) {
                    item.cls = item.cls ? `${item.cls} ${postCls}` : postCls;
                }
                return fct(defaults(item, defaultParams));
            }
        });

    return React.createElement(type, props, ...items);
}


/**
 * Create a factory/function that can be used to create a React Element
 * using native javascript.
 *
 * This is a 'curried' version of the raw elem() method.  See that method,
 * and the documentation for its rest arguments for details on how to call
 * the function returned by this method.
 *
 * @param C, React Component for which to create the element.
 * @return {Function}
 */
export function elemFactory(C) {
    return function(...args) {
        return elem(C, ...args);
    };
}

//---------------------------------
// Implementation
//----------------------------------
function normalizeArgs(args) {
    const len = args.length;
    if (len === 0) return {};
    if (len === 1) {
        const arg = args[0];
        if (isPlainObject(arg) && !arg.$$typeof) return arg;
    }
    return {items: args};
}

const defaultChildFactory = elemFactory('div');
