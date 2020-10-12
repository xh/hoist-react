/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {debounce as lodashDebounce, isFinite} from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';

/**
 * Is this element visible and not within a hidden sub-tree (e.g. hidden tab)?
 * Based on the underlying css 'display' property of all ancestor properties.
 */
export function isDisplayed(elem) {
    if (!elem) return false;
    while (elem) {
        if (elem.style.display === 'none') return false;
        elem = elem.parentElement;
    }
    return true;
}

/**
 * Observe when a dom node's size changes.
 *
 * @param {function} fn - function to be called with the co-ordinates of the node.
 * @param {Object} node - The DOM node to observe
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {ResizeObserver} - ResizeObserver used to implement this function.
 *      be sure to call disconnect() on this when finished.
 *
 * Unlike the raw ResizeObserver implementation, this function will not run the
 * callback when the dimensions are both changed to 0 or is changed back from 0
 * to a previous size.  This is to improve performance by avoiding responding to
 * visibility changes.
 *
 *  For a hook that conveniently wraps this function see useOnResize().
 */
export function observeResize(fn, node, {debounce}) {
    let prevWidth = null, prevHeight = null;
    let wrappedFn = (e) => {
        const {contentRect, target} = e[0],
            {width, height} = contentRect,
            isVisible = isElVisible(target),
            hasChanged = width !== prevWidth || height !== prevHeight;

        if (isVisible && hasChanged) {
            prevWidth = width;
            prevHeight = height;
            fn(contentRect);
        }
    };
    if (isFinite(debounce) && debounce >= 0) {
        wrappedFn = lodashDebounce(wrappedFn, debounce);
    }

    const ret = new ResizeObserver(wrappedFn);
    ret.observe(node);
    return ret;
}

/**
 * Observe when a dom node's visibility changes.
 *
 * @param {function} fn - function that takes a single argument with visibility.
 * @param {Object} node - The DOM node to observe
 * @returns {ResizeObserver} - ResizeObserver used to implement this function.
 *      be sure to call disconnect() on this when finished.
 *
 * For a hook that conveniently wraps this function see useOnVisibleChange().
 *
 */
export function observeVisibleChange(fn, node) {
    let prevVisible = null;
    const ret = new ResizeObserver(e => {
        const visible = isElVisible(e[0].target),
            hasChanged = visible !== prevVisible;

        if (hasChanged) {
            prevVisible = visible;
            fn(visible);
        }
    });
    ret.observe(node);
    return ret;
}

export function isElVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}