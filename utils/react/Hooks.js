/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect} from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import {isFinite, debounce as lodashDebounce} from 'lodash';

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
 * The resize callback will not run the hook when the size is changed to 0 or is changed back from 0 to a previous
 * size. This is to improve performance by avoiding unneeded resizing.
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.dimsDebounce] - milliseconds to debounce
 * @param {function} [c.fnDims] - called on width or height change
 * @param {function} [c.fnVis] - called when visible change
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnVisDimsChange({fnDims, fnVis, dimsDebounce}) {
    let node, resizeObserverDims, resizeObserverVis;

    // see React example: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
    const ret = useCallback(innerNode => {
        if (innerNode !== null) {
            let prevWidth, prevHeight, prevVisible;

            if (fnDims) {
                const wrappedFn = (e) => {
                    const {width, height} = e[0].contentRect,
                        isVisible = width !== 0 && height !== 0,
                        hasChanged = width !== prevWidth || height !== prevHeight;

                    if (isVisible && hasChanged) {
                        prevWidth = width;
                        prevHeight = height;
                        fnDims(e);
                    }
                };

                const callbackFn = isFinite(dimsDebounce) && dimsDebounce >= 0 ?
                        lodashDebounce(wrappedFn, dimsDebounce) : wrappedFn,
                    dimsObserver = new ResizeObserver(callbackFn);

                dimsObserver.observe(innerNode);
                resizeObserverDims = dimsObserver;
            }


            if (fnVis) {
                const visObserver = new ResizeObserver((e) => {
                    const {width, height} = e[0].contentRect,
                        visible = width !== 0 && height !== 0,
                        hasChanged = visible !== prevVisible;

                    if (hasChanged) {
                        prevVisible = visible;
                        fnVis(visible);
                    }
                });

                visObserver.observe(innerNode);
                resizeObserverVis = visObserver;
            }


            node = innerNode;
        }
    });

    useEffect(() => {
        return () => {
            resizeObserverDims?.unobserve(node);
            resizeObserverVis?.unobserve(node);
        };
    }, [dimsDebounce, node]);

    return ret;
}

/**
 * Hook to run a function when component is resized.
 * This will not run the hook when the size is changed to 0 or is changed back from 0 to a previous
 * size. This is to improve performance by avoiding unneeded resizing.
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnResize(fn, {debounce} = {}) {
    let node, resizeObserver;

    // see React example: https://reactjs.org/docs/hooks-faq.html#how-can-i-measure-a-dom-node
    const ret = useCallback(innerNode => {
        if (innerNode !== null) {
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
                innerResizeObserver = new ResizeObserver(callbackFn);

            innerResizeObserver.observe(innerNode);
            resizeObserver = innerResizeObserver;
            node = innerNode;
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


    const ret = useCallback(innerNode => {
        if (innerNode !== null) {

            let prevVisible;

            const innerResizeObserver = new ResizeObserver((e) => {
                const {width, height} = e[0].contentRect,
                    visible = width !== 0 && height !== 0,
                    hasChanged = visible !== prevVisible;

                if (hasChanged) {
                    prevVisible = visible;
                    fn(visible);
                }
            });

            innerResizeObserver.observe(innerNode);
            resizeObserver = innerResizeObserver;
            node = innerNode;
        }
    });

    useEffect(() => {
        return () => resizeObserver?.unobserve(node);
    }, [node]);

    return ret;
}