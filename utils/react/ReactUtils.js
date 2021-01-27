/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {cloneElement, createElement, isValidElement} from 'react';
import {throwIf} from '../js';

/**
 * Return the display name for either a class-based or functional Component.
 * @param obj
 * @return {string}
 */
export function getReactElementName(obj) {
    return obj.type.name || obj.type.displayName;
}

/**
 * Create a React element from either a HoistComponent or a function returning an element.
 *
 * Used by the TabContainer, DashContainer, DockView, and Navigator APIs to process the 'content'
 * configs provided to them for their tabs and views.
 *
 * @param {(Object|function)} content - HoistComponent or function returning a React element. If a
 *      function, it may be an 'elemFactory' (as created by elemFactory()), or any function that
 *      returns a React element. In either case, the function will be called with no arguments.
 * @param {Object} [addProps] -- optional additional props to apply to the element.
 *      These will override any existing props placed on the element, and should be used with care.
 */
export function elementFromContent(content, addProps) {

    // Note: Would be more general to look for a *react* component.
    if (content.isHoistComponent) {
        return createElement(content, addProps);
    }

    const ret = content();
    if (ret === null) return null;
    throwIf(!isValidElement(ret),
        'Must specify either a HoistComponent or a function that returns a React Element.'
    );
    return addProps ? cloneElement(ret, addProps) : ret;
}
