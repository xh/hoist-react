/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {TEST_ID} from '@xh/hoist/utils/js';
import {castArray, isFunction, isNil, isPlainObject} from 'lodash';
import {
    ComponentType,
    createElement as reactCreateElement,
    isValidElement,
    JSX,
    Key,
    ReactElement,
    ReactNode
} from 'react';
import {Some, Thunkable} from './types/Types';

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
export type ElementSpec<P> = P & {
    //---------------------------------------------
    // Enhanced attributes to support element factory
    //---------------------------------------------
    /** Child Element(s). Equivalent provided as Rest Arguments to React.createElement.*/
    items?: Some<ReactNode>;

    /**  Equivalent to `items`, offered for code clarity when only one child is needed. */
    item?: Some<ReactNode>;

    /** True to exclude the Element. */
    omit?: Thunkable<boolean>;

    //-----------------------------------
    // Core React attributes
    //-----------------------------------
    /** React key for this component. */
    key?: Key;

    /**
     * Supports passing a "data-testid" prop to built-in tags (e.g. `div`), to be rendered as an
     * HTML attribute. See {@link TestSupportProps} for the higher-level `testId` prop that most
     * Hoist components accept and should use.
     */
    [TEST_ID]?: string;

    //----------------------------
    // Technical -- Escape support
    //----------------------------
    $items?: any;
    $item?: any;
    $omit?: any;
};

export type ElementFactory<P = any> = ((...args: ReactNode[]) => ReactElement<P, any>) &
    ((arg: ElementSpec<P>) => ReactElement<P, any>);

/**
 * Create a React Element from a Component type and an ElementSpec.
 *
 * This function is a thin-wrapper over `React.createChildren` that
 * consumes the ElementSpec format.
 *
 * @param type - React Component or string representing an HTML element.
 * @param spec - element spec.
 */
export function createElement<P = any>(type: any, spec: ElementSpec<P>): ReactElement<P, any> {
    const {omit, item, items, ...props} = spec;

    // 1) Convenience omission syntax.
    if (isFunction(omit) ? omit() : omit) return null;

    // 2) Read children from item[s] config.
    const itemConfig = item ?? items,
        children = isNil(itemConfig) ? [] : castArray(itemConfig);

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
 */
export function elementFactory<
    T extends ComponentType | keyof JSX.IntrinsicElements,
    P = PropType<T>
>(type: T): ElementFactory<P> {
    const ret = function (...args) {
        return createElement<P>(type, normalizeArgs(args, type));
    };
    ret.isElementFactory = true;
    return ret;
}

//------------------------
// Implementation
//------------------------
function normalizeArgs(args: any[], type: any) {
    const len = args.length;
    if (len === 0) return {};
    if (len === 1) {
        const arg = args[0];
        if (isPlainObject(arg) && !isValidElement(arg)) return arg;
        return {items: arg};
    }
    // Assume > 1 args are children.
    return {items: args};
}

type PropType<T> =
    T extends ComponentType<infer P>
        ? P
        : T extends keyof JSX.IntrinsicElements
          ? JSX.IntrinsicElements[T]
          : any;
