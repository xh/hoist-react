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
    JSXElementConstructor, ForwardedRef
} from 'react';
import {PlainObject, Some} from './';


/**
 * Alternative format for specifying React Elements in render functions. This type is designed to
 * provide a well-formatted, declarative, native javascript approach to configuring Elements and
 * their children. It serves as an alternative to JSX and is especially useful for code-heavy
 * element trees. (For element trees with a significant amount of hypertext, JSX could be a better
 * choice.)
 *
 * The core enhancement to this format over jsx is it expects child elements and props to be
 * specified in a single bundle, with children placed within an `item` or `items` key. This allows
 * developers to write declarative, multi-level element trees in a concise yet highly-readable
 * style.  An additional feature is the minor-but-useful support for an `omit` property, which
 * allows element subtrees to be declaratively excluded from rendering if a given condition is met.
 * This avoids the need for the common, but clunky React practice of wrapping elements in ternary
 * statements to accomplish conditional rendering.
 *
 * @see {@link createElement} - That function is a thin-wrapper over `React.createChildren` that
 * consumes this format.
 *
 * Finally, note that if a React Component has its own props of `item`, `items`, or `omit`, the
 * props may be specified in this object with a `$` prefix (e.g. `$item`) to avoid conflicting
 * with this API.  The '$' will be stripped from the prop name before passing it along to the
 * underlying component.
 */
export type ElementSpec<P extends PlainObject> = P & {

    //---------------------------------------------
    // Enhanced attributes to support element factory
    //---------------------------------------------
    /** Child Element(s). Equivalent provided as Rest Arguments to React.createElement.*/
    items?: Some<ReactNode>;

    /**  Equivalent to `items`, offered for code clarity when only one child is needed. */
    item?: Some<ReactNode>;

    /** True to exclude the Element. */
    omit?: boolean;

    //-----------------------------------
    // Core React attributes
    //-----------------------------------
    /** React Ref for this component. */
    ref?: ForwardedRef<any>;

    /** React key for this component. */
    key?: string|number;

    //-----------------------------------------------------
    // Technical -- Escape support, prevent React Element.
    //-----------------------------------------------------
    $items?: any;
    $item?: any;
    $omit?: any;
    props?: never;
}

export type ElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    StandardElementFactory<P, T> | ContainerElementFactory<P, T>;

export type StandardElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    (arg?: ElementSpec<P>) => ReactElement<P, T>;

export type ContainerElementFactory<P = any, T extends string|JSXElementConstructor<P> = any> =
    ((arg?: ElementSpec<P>) => ReactElement<P, T>) &
    ((...args: ReactNode[]) => ReactElement<P, T>);

/**
 * Create a React Element from a Component type and an ElementSpec.
 *
 * This function is a thin-wrapper over `React.createChildren` that
 * consumes the ElementSpec format.
 *
 * @param type - React Component or string representing an HTML element.
 * @param spec - element spec.
 */
export function createElement<P=any, T extends string|JSXElementConstructor<any>=any>(
    type: T,
    spec: ElementSpec<P>
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
export function normalizeArgs(args: any[], type: any, simple: boolean) {
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
    let typeName = type.displayName ?? type.toString(),
        msg = `Raw react nodes passed to a standard factory for '${typeName}'. ` +
            'Please call with an ElementSpec object instead.';
    if (typeName != 'Panel') {
        msg += ` Alternatively, if you are defining '${typeName}', you may create a 'containerElementFactory' for it instead.`;
    }
    console.warn(msg);
}