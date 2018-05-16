/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray, defaults, forOwn, isArray, isEmpty, isNumber, isPlainObject, isString} from 'lodash';
import {isReactElement} from 'hoist/utils/ReactUtils';
import {Exception} from 'hoist/exception';

/**
 * Convenience method for creating React Elements. This method is designed to provide a  well-
 * formatted, declarative native javascript approach to configuring Elements and their children
 * without writing JSX.
 *
 * An important feature of this factory is that children with property `omit` set to true will be
 * skipped, allowing for conditional inclusion of elements in the vDOM in a declarative style.
 *
 * Note that if a React Component has a native property that conflicts with this API, it should be
 * specified as native with a $ prefix (e.g. '$items'). This method will recognize and pass the
 * property appropriately.
 *
 * @param {(Object|string)} type - class that extends Component, or a string representing an HTML element
 * @param {Object} [config] - config props to be applied to the Component
 * @param {string} [config.cls] - CSS classes for this element (alias for React 'className')
 * @param {(Array|Element|Object|string)} [config.items] - child element(s) specified as React
 *      Elements, raw JS objects, or strings. Elements will be created for any raw objects by
 *      calling a factory as per config.itemSpec (below).
 * @param {(Element|Object|string)} [config.item] - a single child - equivalent to items, offered
 *      for code clarity when only one child is needed.
 * @param {(function|Object)} [config.itemSpec] - element factory to be used to create child items
 *      from raw objects, or an object of the form {factory, ...props}, where props will serve as
 *      defaults for children.
 * @param {*} [config...props] - any additional props to apply to this element
 * @return ReactElement
 */
export function elem(type, config = {}) {

    let {cls, item, items, itemSpec, omit, ...props} = config;

    // 1) Handle basic rename
    if (cls) {
        props.className = cls;
    }

    // 2) Mark element to be skipped with a special key in props.  This element should never see the light of day
    // if its *parent* is created using this method, but this should be safe and truthy attribute to use.
    if (omit) props.xhomit = 'true';

    // 3) Special handling to recapture API props that conflicted.
    ['$items', '$item', '$cls', '$itemSpec', '$omit'].forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props.$items;
        }
    });

    // 4) Process promoted style props
    const processedStyles = processStyleProps(props);
    if (!isEmpty(processedStyles)) {
        props.style = processedStyles;
    }

    // 5) Process children
    items = item || items;
    items = castArray(items);
    
    itemSpec = isPlainObject(itemSpec) ? itemSpec : {factory: itemSpec};
    const {factory, ...defaultParams} = itemSpec;
    items = items
        .filter(it => it != null)
        .map(it => {
            if (isReactElement(it) || isString(it)) {
                return it;
            } else {
                const fct = it.factory || factory;
                if (fct) return fct(defaults(it, defaultParams));
            }

            throw Exception.create(`Unable to create child element for [${it.toString()}].`);
        });

    // 5a) Remove omitted children last, after elements generated from configs have been created.
    items = items.filter(it => !it.props || !it.props.xhomit);

    return React.createElement(type, props, ...items);
}


/**
 * Returns a factory function that can create a ReactElement using native JS (i.e. not JSX).
 * This is a 'curried' version of the raw elem() method and adds two critical features:
 *
 *   1) Allows argument to be an array, or rest arguments that are children to be directly passed
 *      to the new Element. Equivalent to specifying `{items: args}`. Useful when no attributes
 *      need to be applied directly to the Element.
 *   2) Allows the addition of fixed default props to be applied before passing to the elem factory.
 *
 * @param {Component} C - React Component for which this factory will create Elements
 * @param {Object} [defaultProps] - optional defaults to be applied to the elem props
 * @return {function}
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

const styleKeys = [
    'display',
    'top', 'left', 'position',
    'alignItems', 'alignSelf', 'alignContent',
    'flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap',
    'overflow', 'overflowX', 'overflowY',
    'justifyContent', 'order',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'height', 'minHeight', 'maxHeight',
    'width', 'minWidth', 'maxWidth'
];

const dimFragments = ['margin', 'padding', 'height', 'width'],
    flexVals = ['flex', 'flexGrow', 'flexShrink'];

function processStyleProps(appProps) {
    const props = Object.assign({}, appProps);

    // 1) Convert raw 'flex' number to string
    flexVals.forEach(k => {
        const val = appProps[k];
        if (isNumber(val)) props[k] = val.toString();
    });

    // 2) Translate raw dimensions to pixels
    forOwn(appProps, (val, key) => {
        const k = key.toLowerCase();
        if (isNumber(val) && dimFragments.some(it => k.includes(it))) {
            props[k] = val + 'px';
        }
    });

    // 3) Move properties of interest to 'style'
    const style = Object.assign({}, props.style);
    styleKeys.forEach(k => {
        const val = props[k];
        if (val !== undefined) {
            style[k] = val;
            delete appProps[k];
        }
    });

    return isEmpty(style) ? null : style;
}