/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isFinite, debounce as lodashDebounce} from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';


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
 * This will not run the hook when the size is changed to 0 or is changed back from 0 to a previous
 * size. This is to improve performance by avoiding unneeded resizing.
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @param {Ref} [c.ref] - existing ref to observe. If not provided, a ref will be created
 * @returns {Ref} - ref to be placed on target component
 */
export function onResize(fn, {debounce, ref} = {}) {

    const {current} = ref;

    if (!current) return;

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

    const callbackFn = isFinite(debounce) && debounce >= 0 ? lodashDebounce(wrappedFn, debounce) : wrappedFn,
        resizeObserver = new ResizeObserver(callbackFn);

    resizeObserver.observe(current);
    return () => resizeObserver.unobserve(current);
}
