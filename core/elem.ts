/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {castArray, isNil, isPlainObject} from 'lodash';
import {
    createElement as reactCreateElement,
    isValidElement,
    ReactNode,
    ReactElement,
    JSXElementConstructor
} from 'react';
import {Some} from './';


/**
 * Alternative format for specifying React Elements in render functions. This method is designed to
 * provide a well-formatted, declarative, native javascript approach to configuring Elements and
 * their children. It serves as an alternative to JSX and is especially useful for code-heavy
 * element trees. (For element trees with a significant amount of hypertext, JSX could be a better
 * choice.)
 *
 * The core enhancement to this format over jsx is it expects child elements and props to be
 * specified in a single bundle, with children placed within an `item` or `items` key. This allows
 * developers to write declarative, multi-level element trees in a concise yet highly-readable
 * style.
 *
 * This format is largely just a thin-wrapper over `React.createChildren`. A notable exception to
 * this is the minor-but-useful support for an `omit` property, which allows element
 * subtrees to be declaratively excluded from rendering if a given condition is met.
 *
 * Also Note that if a React Component has its own property of `item`, `items`, or `omit`, the
 * property must be specified with a `$` prefix (e.g. `$item`) to avoid conflicting with this API.
 *
 * @see {@link elem} - a generic function that also consumes this format.
 */
export interface ElementSpec {

    /** Child Element(s). Equivalent provided as Rest Arguments to React.createElement.*/
    items?: Some<ReactNode>;

    /**  Equivalent to `items`, offered for code clarity when only one child is needed. */
    item?: Some<ReactNode>;

    /** True to exclude the Element. */
    omit?: boolean;
}

export type WithElementSpec<P> = P & ElementSpec;

export type ElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    StandardElementFactory<P, T> | ContainerElementFactory<P, T>;

export type StandardElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    (arg?: (P extends ElementSpec ? P : WithElementSpec<P>)) => ReactElement<P, T>;

export type ContainerElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    ((arg?: (P extends ElementSpec ? P : WithElementSpec<P>)) => ReactElement<P, T>) &
    ((...args: ReactNode[]) => ReactElement<P, T>);

/**
 * Create a React Element from a Component type and an ElementSpec
 *
 * @param type - React Component or string representing an HTML element.
 * @param spec - element spec.
 */
export function createElement<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T,
    spec: (P extends ElementSpec ? P : WithElementSpec<P>)
): ReactElement<P, T> {
    const {omit, item, items, ...props} = spec;

    // 1) Convenience omission syntax.
    if (omit) return null;

    // 2) Read children from item[s] config.
    const itemConfig = item ?? items,
        children = (isNil(itemConfig) ? [] : castArray(itemConfig));

    // 3) Recapture API props that needed '$' prefix to avoid conflicts.
    ['$omit', '$item', '$items'].forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props[key];
        }
    });

    return reactCreateElement(type, props as P, ...children) as any;
}

/**
 *  Create a factory function that can create a ReactElement from an ElementSpec.
 *  This is the element factory that is appropriate for components that receive a mixture of
 *  children and attributes and should be the one created for most components.
 *
 *  For components that are often provided *only* with children (e.g. container components such as
 *  toolbars, or table cells), see {@link containerElementFactory}.
 */
export function elementFactory<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T
): StandardElementFactory<P, T> {
    const ret = function(...args) {
        return createElement<P, T>(type, normalizeArgs(args, type, true));
    };
    ret.isElementFactory = true;
    return ret;
}

/**
 *  Create a factory function that can create a ReactElement from either an ElementSpec, *OR* an
 *  argument list or array of react nodes (children).  Use this function for components that are
 *  often provided *only* with children (e.g. container components such as toolbars, or table
 *  cells), asit provides a more minimal style
 *
 *  For a simpler alternative that should be used from most components see
 *  {@link elementFactory}
 */

export function containerElementFactory<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T
): ContainerElementFactory<P, T> {
    const ret = function(...args) {
        return createElement<P, T>(type, normalizeArgs(args, type, false));
    };
    ret.isElementFactory = true;
    return ret;
}


//------------------------
// Implementation
//------------------------
function normalizeArgs(args: any[], type: any, simple: boolean) {
    const len = args.length;
    if (len === 0) return {};
    if (len === 1) {
        const arg = args[0];
        if (isPlainObject(arg) && !isValidElement(arg)) return arg;

        if (simple) childrenPassedToSimpleFactory(type);
        return {items: arg};
    }
    // Assume > 1 args are children.
    if (simple) childrenPassedToSimpleFactory(type);
    return {items: args};
}

function childrenPassedToSimpleFactory(type) {
    const typeName = type.displayName ?? type.toString();
    console.warn(
        `Your application passed raw children to a 'StandardElementFactory' for Component '${ typeName }'.  This may not be ` +
        'supported in future versions of StandardElementFactory.  Please call factory with an object implementing ' +
        'ElementSpec or create your factory with `containerElementFactory` instead.'
    );
}
