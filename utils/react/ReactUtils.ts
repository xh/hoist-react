/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {FunctionComponent, ReactElement, cloneElement, createElement, isValidElement} from 'react';
import {throwIf} from '../js';
import {isFunction, isNil} from 'lodash';
import {ElemFactory} from '@xh/hoist/core';

/**
 * Return the display name for either a class-based or functional Component.
 */
export function getReactElementName(obj: any): string {
    return obj.type.name || obj.type.displayName;
}

/**
 * Create a React element from either a HoistComponent or a function returning an element.
 *
 * Used by the TabContainer, DashContainer, DockView, and Navigator APIs to process the 'content'
 * configs provided to them for their tabs and views.
 *
 * @param content - ReactElement, HoistComponent or function returning a ReactElement.
 *      If a function, it may be an ElemFactory or any function that returns a ReactElement. In
 *      either case, the function will be called with no arguments.
 * @param [addProps] -- optional additional props to apply to the element.  These will override
 *      any existing props placed on the element, and should be used with care.
 */
export function elementFromContent<P>(
    content: ReactElement<P>|FunctionComponent<P>|ElemFactory<P>|(() => ReactElement<P>),
    addProps?: object
): ReactElement {
    let c = content as any;
    if (isNil(c)) return null;

    if (c.isElemFactory) {
        return c(addProps);
    }

    // Note: Would be more general to look for a *react* component.
    if (c.isHoistComponent) {
        return createElement(c, addProps);
    }

    const ret = isFunction(c) ? c() : c;
    if (ret === null) return null;
    throwIf(!isValidElement(ret),
        'Must specify either a React Element, HoistComponent or a function that returns a React Element.'
    );
    return addProps ? cloneElement(ret, addProps) : ret;
}