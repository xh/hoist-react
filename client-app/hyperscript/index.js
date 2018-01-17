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
 * Generate a 'hyperscript' element factory for a given react Component or HTML node
 *
 * @param type, string representing html element, or React Component
 * @returns React Element.
 *
 * This method will create an element function that takes a single object of the following
 * form and returns a React elements.  All inputs below are optional.
 *          {
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
 *          }
 */

/**
 * Create a factory/function that can be used to create a React Element
 * using hyperscript above.
 *
 * @param C, React Component for which to create the element.
 * @return {Function}
 */
export function elemFactory(C) {
    return function(obj) {
        return elem(C, obj);
    };
}

//---------------------------------
// Implementation
//----------------------------------
const defaultChildFactory = elemFactory('div');
export function elem(type, {items, itemSpec, cls, ...props} = {}) {
    items = asArray(items);

    // 0) Handle basic renames
    if (cls) props.className = cls;

    // 1) Special handling for actual property 'items' (apps must use $items)
    // TODO: consider renaming this to: 'has'? 'children'?  Will items often collide?
    if (props.$items) props.items = props.$items;

    // 2) process children with itemSpecs
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
