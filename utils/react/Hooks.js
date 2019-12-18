/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {useEffect, useRef} from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import {isFinite, debounce} from 'lodash';

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
 * @param {number} [delay] - milliseconds to debounce
 * @returns {Ref} - ref to be placed on target component
 */
export function useOnResize(fn, delay) {
    const ref = useRef(null);

    useEffect(() => {
        const {current} = ref;
        if (!current) return;

        const callbackFn = isFinite(delay) && delay >= 0 ? debounce(fn, delay) : fn,
            resizeObserver = new ResizeObserver(callbackFn);

        resizeObserver.observe(current);
        return () => resizeObserver.unobserve(current);
    }, [ref.current, delay]);

    return ref;
}
