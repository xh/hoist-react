/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Is this element visible and not within a hidden sub-tree (e.g. hidden tab)?
 * Based on the underlying css 'display' property of all ancestor properties.
 */
export function isDisplayed(elem) {
    if (!elem) return false;
    while (elem) {
        if (elem.style.display == 'none') return false;
        elem = elem.parentElement;
    }
    return true;
}
