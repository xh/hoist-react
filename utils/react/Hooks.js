/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect} from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import {isFinite, isNil, debounce as lodashDebounce} from 'lodash';

/**
 * Hook to run a function once after component has been mounted.
 * @param {function} fn
 */
export function useOnMount(fn) {
    useEffect(
        () => {fn(); return undefined},
        []
    );
}

/**
 * Hook to run a function once after component has been unmounted.
 * @param {function} fn
 */
export function useOnUnmount(fn) {
    useEffect(
        () => fn,
        []
    );
}

/**
 * Hook to run a function when component is resized or content becomes visible/invisible.
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.dimsDebounce] - milliseconds to debounce
 * @param {function} [c.fnDims] - called on width or height change
 * @param {function} [c.fnVis] - called when visible change
 * @returns {Ref} - callback ref to be placed on target component - this is not
 *                  a DOM node.  Its the callback passed to `useCallBack`
 */
export function useOnVisDimsChange({fnDims, fnVis, dimsDebounce}) {
    let node, dimsObserver, visObserver;

    // see React example: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
    const ret = useCallback(_node => {
        if (!isNil(_node)) {
            dimsObserver = onResize(fnDims, dimsDebounce, _node);
            visObserver = onVisibleChange(fnVis, _node);
            node = _node;
        }
    });

    useEffect(() => {
        return () => {
            dimsObserver?.unobserve(node);
            visObserver?.unobserve(node);
        };
    }, [dimsDebounce, node]);

    return ret;
}

/**
 * Hook to run a function when component is resized.
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnResize(fn, {debounce} = {}) {
    let node, resizeObserver;
    const ret = useCallback(_node => {
        if (!isNil(_node)) {
            resizeObserver = onResize(fn, _node, {debounce});
            node = _node;
        }
    });

    useEffect(() => {
        return () => resizeObserver?.unobserve(node);
    }, [debounce, node]);

    return ret;
}

/**
 * Hook to run a function when component becomes visible / invisible.
 * The function with receive boolean visible as its argument.
 * @param {function} fn
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnVisibleChange(fn) {
    let node, resizeObserver;
    const ret = useCallback(_node => {
        if (!isNil(_node)) {
            resizeObserver = onVisibleChange(fn, _node);
            node = _node;
        }
    });

    useEffect(() => {
        return () => resizeObserver?.unobserve(node);
    }, [node]);

    return ret;
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