/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {defaults, isPlainObject, isString, isArray} from 'lodash';
import {asArray} from 'hoist/utils/JsUtils';
import {isReactElement} from 'hoist/utils/ReactUtils';

/**
 * Convenience method for creating React Elements with native javascript.  This method is designed
 * to provide a well-formatted, declarative native javascript alternative to JSX.
 *
 * @param type, string representing html element, or React Component
 * @param config, additional arguments to populate the component.
 *
 * config should be a single config object with the following structure:
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
 *               ...props:  other properties to apply to this element
 *        }
 *
 *  One important feature of this factory is that children with property 'omit' set to true will be skipped.
 *  This allows for conditional inclusion of elements in the virtual dom in a declarative style.
 *
 *  Note that if a React Component has a native property that conflicts with this API, it should be specified as native
 *  with a $ prefix (e.g. '$items'). This method will recognize and pass the property appropriately.
 *
 */


export function elem(type, config = {}) {

    let {cls, item, items, itemSpec, omit, ...props} = config;

    // 1) Handle cls shortcut for CSS className. Add Blueprint pt-dark cls whenever xh-dark requested for dark theme.
    if (cls) {
        const clsList = cls.split(' ');
        if (clsList.includes('xh-dark')) clsList.push('pt-dark');
        props.className = clsList.join(' ');
    }

    // 2) Mark element to be skipped with a special key in props.  This element should never see the light of day
    // if its *parent* is created using this method, but this should be safe and truthy attribute to use.
    if (omit) props.xhOmit = 'true';

    // 3) Special handling to recapture API props that conflicted.
    ['$items', '$item', '$cls', '$itemSpec', '$omit'].forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props.$items;
        }
    });

    // 4) process children
    items = item || items;
    items = asArray(items);
    
    itemSpec = isPlainObject(itemSpec) ? itemSpec : {factory: itemSpec};
    const {factory, ...defaultParams} = itemSpec;
    items = items
        .filter(it => it != null)
        .map(it => {
            if (isReactElement(it) || isString(it)) {
                return it;
            } else {
                const fct = it.factory || factory;
                if (!fct) {
                    throw Exception.create('Unable to create child element.  No factory provided in itemSpec.');
                }
                return fct(defaults(it, defaultParams));
            }
        });

    // 4a) Remove omitted children last, after elements generated from configs have been created.
    items = items.filter(it => !it.props || !it.props.xhOmit);

    return React.createElement(type, props, ...items);
}


/**
 * Create a factory/function that can be used to create a React Element using native javascript and elem().
 *
 * This is a 'curried' version of the raw elem() method.   It adds the following two critical features:
 *
 * 1) Allows argument to be an array, or rest arguments that are children objects to be directly passed to the new element.
 *  Equivalent to specifying {items: args}.  Useful when no attributes need to be applied directly to the Element.
 *
 * 2) Allows the addition of fixed default props to be applied before passing to the element factory.
 *
 * @param C, React Component for which to create the element.
 * @param defaultProps, (optional) defaults to be applied to the elem props.
 * @return {Function}
 */
export function elemFactory(C, defaultProps) {
    return function(...args) {
        args = normalizeArgs(args);
        if (defaultProps) {
            defaults(args, defaultProps);
        }
        return elem(C, args);
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