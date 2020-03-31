/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect, useRef} from 'react';
import {observeVisibleChange, observeResize} from '@xh/hoist/utils/js';

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
 * Hook to run a function when a dom element is resized.
 *
 * @param {function} fn
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnResize(fn, {debounce} = {}) {
    const observer = useRef(null);
    useOnUnmount(() => observer.current?.disconnect());

    return useCallback(node => {
        observer.current?.disconnect();
        if (node) observer.current = observeResize(fn, node, {debounce});
    }, [debounce]);
}

/**
 * Hook to run a function when component becomes visible / invisible.
 *
 * @see observeVisibleChange() for more details on the
 *
 *
 * @param {function} fn
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnVisibleChange(fn) {
    const observer = useRef(null);
    useOnUnmount(() => observer.current?.disconnect());

    return useCallback(node => {
        observer.current?.disconnect();
        if (node) observer.current = observeVisibleChange(fn, node);
    }, []);
}