/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import ResizeObserver from 'resize-observer-polyfill';
import {isFinite, debounce as lodashDebounce} from 'lodash';

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

/**
 * Run a function when component is resized.
 * This will not run the function when the size is changed to 0 or is changed back from 0 to a previous
 * size. This is to improve performance by avoiding unneeded resizing.
 * @param {function} fn
 * @param {Object} node - The DOM node to observe
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {Observer} - Observer that can be used to unobserver the node
 */
export function onResize(fn, node, {debounce}) {
    if (fn) {
        let prevWidth, prevHeight;
        const wrappedFn = (e) => {
            const {width, height} = e[0].contentRect,
                isVisible = width !== 0 && height !== 0,
                hasChanged = width !== prevWidth || height !== prevHeight;

            if (isVisible && hasChanged) {
                prevWidth = width;
                prevHeight = height;
                fn(e);
            }
        };

        const callbackFn = isFinite(debounce) && debounce >= 0 ?
                lodashDebounce(wrappedFn, debounce) : wrappedFn,
            observer = new ResizeObserver(callbackFn);

        observer.observe(node);
        return observer;
    }
}

/**
 * Run a function when component becomes visible / invisible.
 * The function with receive boolean visible as its argument.
 * @param {function} fn
 * @param {Object} node - The DOM node to observe
 * @returns {Observer} - Observer that can be used to unobserver the node
 */
export function onVisibleChange(fn, node) {
    if (fn) {
        let prevVisible;
        const observer = new ResizeObserver((e) => {
            const {width, height} = e[0].contentRect,
                visible = width !== 0 && height !== 0,
                hasChanged = visible !== prevVisible;

            if (hasChanged) {
                prevVisible = visible;
                fn(visible);
            }
        });

        observer.observe(node);
        return observer;
    }
}