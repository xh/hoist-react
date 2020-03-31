/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect} from 'react';
import {isNil} from 'lodash';
import {onResize, onVisibleChange} from '@xh/hoist/utils/js';

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
            dimsObserver = onResize(fnDims, _node, {debounce: dimsDebounce});
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