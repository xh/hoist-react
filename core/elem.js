/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray, defaults, forOwn, isArray, pick, isNumber, isPlainObject, isString, merge} from 'lodash';
import {isReactElement} from '@xh/hoist/utils/ReactUtils';
import {Exception} from '@xh/hoist/exception';

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

    // 1) Separate and pre-process custom elem configs (distinct from Component API props).
    let {cls, item, items, itemSpec, omit, ...props} = config;

    if (cls) props.className = cls;
    if (omit) props.xhOmit = 'true';

    if (type.layoutSupport) {
        processLayoutConfig(props);
    }

    // 2) Special handling to recapture API props that needed '$' prefix to avoid conflicts with above.
    forOwn(props, (val, key) => {
        if (key.startsWith('$')) {
            props[key.substring(1)] = props[key];
            delete props[key];
        }
    });

    // 3) Process children.
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

    // 4) Remove omitted children last, after elements generated from configs have been created.
    items = items.filter(it => !it.props || !it.props.xhOmit);

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

//-------------------------------------------------------------------------
// Support for layoutConfig
// Pre-process and bundle layout related keys below into a 'layoutConfig' key
//-------------------------------------------------------------------------
const dimKeys = [
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'height', 'minHeight', 'maxHeight',
    'width', 'minWidth', 'maxWidth'
];
const flexKeys = ['flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap'];
const alignKeys = ['alignItems', 'alignSelf', 'alignContent', 'justifyContent'];
const overflowKeys = ['overflow', 'overflowX', 'overflowY'];
const otherKeys = ['top', 'left', 'position', 'display'];
const allKeys = [...dimKeys, ...flexKeys, ...alignKeys, ...overflowKeys, ...otherKeys];

function processLayoutConfig(config) {
    // 1) Harvest, remove, and process all keys of interest
    const layoutConfig = pick(config, allKeys);
    forOwn(layoutConfig, (v, k) => delete config[k]);

    // 1a) flexXXX: convert raw number to string
    const flexConfig = pick(layoutConfig, flexKeys);
    forOwn(flexConfig, (v, k) => {
        if (isNumber(v)) layoutConfig[k] = v.toString();
    });

    // 1b) Dimensions: Translate raw into pixels
    const dimConfig = pick(layoutConfig, dimKeys);
    forOwn(dimConfig, (v, k) => {
        if (isNumber(v)) layoutConfig[k] = v + 'px';
    });

    // 2) Apply this config on top of any config passed in
    config.layoutConfig = config.layoutConfig ? merge(config.layoutConfig, layoutConfig) : layoutConfig;
}
