/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {observeResize, observeVisibleChange} from '@xh/hoist/utils/js';
/* eslint-disable react-hooks/exhaustive-deps */
import {useCallback, useEffect, useRef} from 'react';

/**
 * Hook to run a function once after component has been mounted.
 */
export function useOnMount(fn: () => void) {
    useEffect(() => {
        fn();
        return undefined;
    }, []);
}

/**
 * Hook to run a function once after component has been unmounted.
 */
export function useOnUnmount(fn: () => void) {
    useEffect(() => fn, []);
}

/**
 * Hook to run a function when a DOM element is resized.
 *
 * @see observeResize() for more details.
 *
 * @param fn - receives a DOMRect containing the dimensions of the DOM element.
 * @param opts - extra options, currently supporting a `debounce` specified in ms.
 * @returns callback ref to be placed on target component
 */
export function useOnResize(
    fn: (rect: DOMRect) => any,
    opts: {debounce?: number} = {}
): (node: any) => void {
    const observer = useRef(null);
    useOnUnmount(() => observer.current?.disconnect());

    return useCallback(
        node => {
            observer.current?.disconnect();
            if (node) observer.current = observeResize(fn, node, opts);
        },
        [opts.debounce]
    );
}

/**
 * Hook to run a function when a DOM element becomes visible / invisible.
 *
 * @see observeVisibleChange() for more details.
 *
 * @param fn - receives a boolean signifying if visible.
 * @returns callback ref to be placed on target component
 */
export function useOnVisibleChange(fn: (visible: boolean) => any): (node: any) => void {
    const observer = useRef(null);
    useOnUnmount(() => observer.current?.disconnect());

    return useCallback(node => {
        observer.current?.disconnect();
        if (node) observer.current = observeVisibleChange(fn, node);
    }, []);
}

/**
 * Hook to run a function when a DOM element scrolls.
 *
 * @param fn - receives the scroll event.
 * @returns callback ref to be placed on target component
 */
export function useOnScroll(fn: (ev: Event) => any): (node: any) => void {
    return useCallback(node => {
        node?.addEventListener('scroll', fn);
    }, []);
}

/**
 * Hook to return a cached version of a value - similar useCallback() and useMemo().
 * Useful for providing stable object references across renders.
 *
 * @param value - value (typically an object) to be cached and potentially returned to this and
 *      subsequent calls.
 * @param equalsFn - A function taking the previously cached value and the currently presented
 *      value. If evaluates to true, the cached value will be returned rather than the presented
 *      value. If null, any cached value will always be returned.
 */
export function useCached<T>(value: T, equalsFn: (prev: T, curr: T) => boolean): T {
    const cache = useRef(value),
        cachedVal = cache.current;
    if (cachedVal !== value && equalsFn && !equalsFn(cachedVal, value)) {
        cache.current = value;
    }
    return cache.current;
}
