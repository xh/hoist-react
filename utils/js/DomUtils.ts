/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {debounce as lodashDebounce, isFinite} from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';
import {SyntheticEvent} from 'react';

/**
 * Is this element visible and not within a hidden sub-tree (e.g. hidden tab)?
 * Based on the underlying css 'display' property of all ancestor properties.
 */
export function isDisplayed(elem: HTMLElement): boolean {
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
 * @param fn - function to be called with the co-ordinates of the node.
 * @param node - The DOM node to observe
 * @param opts - extra options, currently supporting a `debounce` specified in ms.
 * @returns ResizeObserver used to implement this function. Be sure to call disconnect()
 *      on this when finished.
 *
 * Unlike the raw ResizeObserver implementation, this function will not run the
 * callback when the dimensions are both changed to 0 or is changed back from 0
 * to a previous size.  This is to improve performance by avoiding responding to
 * visibility changes.
 *
 * For a hook that conveniently wraps this function see {@link useOnResize}.
 */
export function observeResize(
    fn: (size: DOMRect) => any,
    node: Element,
    opts: {debounce?: number} = {}
): ResizeObserver {
    let prevWidth = null,
        prevHeight = null;
    let wrappedFn = e => {
        const {contentRect} = e[0],
            {width, height} = contentRect,
            isVisible = width !== 0 && height !== 0,
            hasChanged = width !== prevWidth || height !== prevHeight;

        if (isVisible && hasChanged) {
            prevWidth = width;
            prevHeight = height;
            fn(contentRect);
        }
    };
    if (isFinite(opts.debounce) && opts.debounce >= 0) {
        wrappedFn = lodashDebounce(wrappedFn, opts.debounce);
    }

    const ret = new ResizeObserver(wrappedFn);
    ret.observe(node);
    return ret;
}

/**
 * Observe when a dom node's visibility changes.
 *
 * @param fn - function that takes a single argument with visibility.
 * @param node - The DOM node to observe
 * @returns ResizeObserver used to implement this function. Be sure to call disconnect() on this
 *      when finished.
 *
 * For a hook that conveniently wraps this function see {@link useOnVisibleChange}.
 */
export function observeVisibleChange(fn: (visible: boolean) => any, node: Element): ResizeObserver {
    let prevVisible = null;
    const ret = new ResizeObserver(e => {
        const {width, height} = e[0].contentRect,
            visible = width !== 0 && height !== 0,
            hasChanged = visible !== prevVisible;

        if (hasChanged) {
            prevVisible = visible;
            fn(visible);
        }
    });
    ret.observe(node);
    return ret;
}

/**
 * Determines whether an element has an ancestor with a specific class name
 */
export function elemWithin(target: HTMLElement, className: string): boolean {
    for (let elem = target; elem; elem = elem.parentElement) {
        if (elem.classList.contains(className)) return true;
    }
    return false;
}

/**
 * A convenience handler that will call 'stopPropagation'
 * and 'preventDefault' on an event.
 */
export function consumeEvent(e: Event | SyntheticEvent) {
    e.stopPropagation();
    e.preventDefault();
}

/**
 * A convenience handler that will 'stopPropagation' on an event.
 */
export function stopPropagation(e: Event | SyntheticEvent) {
    e.stopPropagation();
}
