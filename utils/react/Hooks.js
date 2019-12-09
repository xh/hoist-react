/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useEffect, useRef} from 'react';
import ResizeObserver from 'resize-observer-polyfill';

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
 * Hook to run a function when component is resized.
 * @param {function} fn
 */
export function useOnResize(fn) {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref || !ref.current) return;

        const resizeObserver = new ResizeObserver(entries => fn(entries)),
            {current} = ref;

        resizeObserver.observe(current);
        return () => resizeObserver.unobserve(current);
    }, [ref]);

    return ref;
}