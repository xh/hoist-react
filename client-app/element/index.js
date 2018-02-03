/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {defaults, isPlainObject, isString, isArray} from 'lodash';
import {XH} from 'hoist';
import {asArray} from 'hoist/utils/JsUtils';

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
 *              items: single or array of child elements.  These may be specified as React Elements, or raw js objects,
 *                      or strings. If specified as objects, elements will be created for them by calling a factory method on each
 *                      object. The creation of child items in this way will be governed by itemSpec.
 *
 *              item: single child element.  The format is equivalent to objects provided to 'items', but offered for
  *                     code clarity when only a single item is provided.
 *
 *              itemSpec: factory, or object of the following form:
 *                      {
 *                          factory: factory to be used for creating child elements, if none specified.
 *                          ...props: other properties to serve as defaults for children.
 *                      }
 *
 *               ...props:  other properties to apply to this element
 *        }
 *
 *  OR
 *
 *  2) an array, or series of arguments that are children objects to be directly passed to the new element.
 *  Equivalent to specifying {items: args} in [1].  Useful when no attributes need to be applied directly
 *  to the Element.
 *
 *  Note that if a React Component has a native property that conflicts with this API, it should be specified as
 *  with a $ prefix (e.g. '$items'). This method will recognize and pass the property appropriately.
 */
export function elem(type, ...args) {

    // 0) Normalize args into well-specified configs.
    let {cls, item, items, itemSpec, ...props} = normalizeArgs(args);

    // 1) Handle basic renames
    if (cls) props.className = cls;

    // 2) Special handling to recapture '$items'/'$item'
    ['$items', '$item', '$cls', '$itemSpec'].forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props.$items;
        }
    });

    // 3) process children
    items = item || items;
    items = asArray(items);
    
    itemSpec = isPlainObject(itemSpec) ? itemSpec : {factory: itemSpec};
    const {factory, ...defaultParams} = itemSpec;
    items = items
        .filter(it => !!it)
        .map(it => {
            if (it.$$typeof || isString(it)) {
                return it;
            } else {
                const fct = it.factory || factory;
                if (!fct) {
                    throw XH.exception('Unable to create child element.  No factory provided in itemSpec.');
                }
                return fct(defaults(it, defaultParams));
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
        if (isArray(arg)) return {items: arg};
    }
    return {items: args};  // Assume > 1 args are all children
}