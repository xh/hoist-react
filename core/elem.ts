/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {TEST_ID} from '@xh/hoist/utils/js';
import {castArray, isFunction, isNil, isPlainObject} from 'lodash';
import type {ComponentType, JSX, Key, ReactElement, ReactNode} from 'react';
import {createElement as reactCreateElement, isValidElement} from 'react';
import type {PlainObject, Thunkable} from './types/Types';

/**
 * Alternative format for specifying React Elements in render functions. This type is designed to
 * provide a well-formatted, declarative, native javascript approach to configuring Elements and
 * their children. It serves as an alternative to JSX and is especially useful for code-heavy
 * element trees. (For element trees with a significant amount of hypertext, JSX could be a better
 * choice.)
 *
 * The core enhancement to this format over jsx is it expects child elements and props to be
 * specified in a single bundle, with children placed within the standard React `children` key.
 * This allows developers to write declarative, multi-level element trees in a concise yet
 * highly-readable style. An additional feature is the minor-but-useful support for an `omit`
 * property, which allows element subtrees to be declaratively excluded from rendering if a given
 * condition is met. This avoids the need for the common, but clunky React practice of wrapping
 * elements in ternary statements to accomplish conditional rendering.
 *
 * The legacy `item` and `items` keys are still accepted as aliases for `children`. Prefer
 * `children` in new code - the aliases are planned for removal in a future major release.
 *
 * @see {@link createElement} - That function is a thin-wrapper over `React.createElement` that
 * consumes this format.
 *
 * Finally, note that if a React Component has its own props of `item`, `items`, or `omit`, the
 * props may be specified in this object with a `$` prefix (e.g. `$items`) to avoid conflicting
 * with this API.  The '$' will be stripped from the prop name before passing it along to the
 * underlying component.
 */
export type ElementSpec<P> = Omit<P, 'children' | 'items' | 'item' | 'omit'> & {
    //---------------------------------------------
    // Enhanced attributes to support element factory
    //---------------------------------------------
    /**
     * Child Element(s) - a single node or an array. Provided as Rest Arguments to
     * `React.createElement`, so arrays do not require keys. Typed as the component's own
     * `children` prop when it declares one (e.g. a render function).
     */
    children?: 'children' extends keyof P ? P['children'] : ReactNode;

    /** Legacy alias for `children`. Prefer `children` in new code. */
    items?: ReactNode;

    /** Legacy alias for `children`. Prefer `children` in new code. */
    item?: ReactNode;

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
    $items?: 'items' extends keyof P ? P['items'] : never;
    $item?: 'item' extends keyof P ? P['item'] : never;
    $omit?: 'omit' extends keyof P ? P['omit'] : never;
};

/**
 * Union type of all known React Component types supported by Hoist.
 */
export type ReactComponent = ComponentType | keyof JSX.IntrinsicElements;

/**
 * Factory function that can create a ReactElement from an ElementSpec or children.
 * Hoist alternative to JSX.
 */
export type ElementFactory<P = any> = ((arg: ElementSpec<P>) => ReactElement<P, any>) &
    ((...args: ReactNode[]) => ReactElement<P, any>);

/**
 * Create a React Element from a Component type and an ElementSpec.
 *
 * This function is a thin-wrapper over `React.createElement` that
 * consumes the ElementSpec format.
 *
 * @param component - React Component or string representing an HTML element.
 * @param spec - element spec.
 */
export function createElement<C extends ReactComponent>(
    component: C,
    spec: ElementSpec<PropType<C>>
): ReactElement<PropType<C>, C> {
    const {omit, children, item, items, ...props} = spec;

    // 1) Convenience omission syntax.
    if (isFunction(omit) ? omit() : omit) return null;

    // 2) Read children, accepting the legacy item[s] aliases.
    const childSpec = (children ?? item ?? items) as ReactNode,
        childArgs = isNil(childSpec) ? [] : castArray(childSpec);

    // 3) Recapture API props that needed '$' prefix to avoid conflicts.
    ['$omit', '$item', '$items'].forEach(key => {
        if (props.hasOwnProperty(key)) {
            props[key.substring(1)] = props[key];
            delete props[key];
        }
    });

    return reactCreateElement(component, props, ...childArgs) as ReactElement<PropType<C>, C>;
}


/**
 *  Create a factory function that can create a ReactElement from an ElementSpec or list of children.
 */
export function elementFactory<C extends ReactComponent>(component: C): ElementFactory<PropType<C>>;
export function elementFactory<P extends PlainObject>(component: ReactComponent): ElementFactory<P>;
export function elementFactory(component: ReactComponent): ElementFactory {
    const ret = function (...args) {
        return createElement(component, normalizeArgs(args));
    };
    ret.isElementFactory = true;
    return ret;
}

//------------------------
// Implementation
//------------------------
function normalizeArgs(args: any[]) {
    const len = args.length;
    if (len === 0) return {};
    if (len === 1) {
        const arg = args[0];
        if (isPlainObject(arg) && !isValidElement(arg)) return arg;
        return {children: arg};
    }
    // Assume > 1 args are children.
    return {children: args};
}

type PropType<C> =
    C extends ComponentType<infer P>
        ? P
        : C extends keyof JSX.IntrinsicElements
          ? JSX.IntrinsicElements[C]
          : any;
