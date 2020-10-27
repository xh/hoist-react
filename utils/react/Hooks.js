/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {observeResize, observeVisibleChange} from '@xh/hoist/utils/js';
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect, useRef} from 'react';

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
 * @see observeResize() for more details.
 *
 * @param {function} fn - size dimensions of the dom element.
 * @param {Object} [c] - configuration object
 * @param {number} [c.debounce] - milliseconds to debounce
 * @returns {function} - callback ref to be placed on target component
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
 * @see observeVisibleChange() for more details.
 *
 * @param {function} fn
 * @returns {function} - callback ref to be placed on target component
 */
export function useOnVisibleChange(fn) {
    const observer = useRef(null);
    useOnUnmount(() => observer.current?.disconnect());

    return useCallback(node => {
        observer.current?.disconnect();
        if (node) observer.current = observeVisibleChange(fn, node);
    }, []);
}

/**
 * Hook to run a function when component scrolls.
 *
 * @param {function} fn
 * @returns {function} - callback ref to be placed on target component
 */
export function useOnScroll(fn) {
    return useCallback(node => {
        if (node) node.addEventListener('scroll', fn);
    }, []);
}