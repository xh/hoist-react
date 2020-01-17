/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isValidElement, createElement, cloneElement} from 'react';
import {throwIf} from '../js';

export function getReactElementName(obj) {
    return obj.type.name || obj.type.displayName;  // Support for class-based and functional cmps, respectively
}

/**
 * Create a react element from either a HoistComponent, or a function returning an element.
 *
 * Used by the TabContainer, DashContainer, and DockView APIs to process the application
 * 'content' parameters provided to them for their tabs and views.
 *
 * @param {(Object|function)} content - HoistComponent or function returning a React element.  If a
 *      function, it may be an 'elemFactory' (as created by elemFactory()), or simply any
 *      function that returns a valid react element.  In any case, the function will be called
 *      with no arguments.
 *
 * @param {Object} [addProps] -- optional additional props to apply to the element.
 *      These will override any existing props placed on the element, and should be used with care.
 */
export function elementFromContent(content, addProps) {

    // Note: Would be more general to look for a *react* component.
    if (content.isHoistComponent) {
        return createElement(content, addProps);
    }

    const ret = content();
    throwIf(!isValidElement(ret),
        'Must specify either a HoistComponent or a function that returns a valid React Element.'
    );
    return addProps ? cloneElement(ret, addProps) : ret;
}