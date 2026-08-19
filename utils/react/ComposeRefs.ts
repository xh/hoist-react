/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {MutableRefObject, Ref, RefObject, useCallback} from 'react';

type OptRef<T> = Ref<T> | undefined;

/**
 * Compose two or more refs into a single callback ref. Returns `null` if all inputs are nullish,
 * or the lone non-nullish ref when only one is provided.
 *
 * Composed callbacks are cached pairwise in a WeakMap keyed by the input refs, so repeated calls
 * with the same inputs return the same callback identity - preserving referential stability across
 * renders without requiring callers to wrap in `useMemo` / `useCallback`.
 *
 * Adapted from the (now unmaintained) `@seznam/compose-react-refs` package by Seznam.cz,
 * https://github.com/seznam/compose-react-refs - MIT licensed.
 *
 * Prefer the `useComposedRefs` hook variant within component render functions - it also forwards
 * React 19 ref-callback cleanups, which this legacy form does not.
 */
export function composeRefs<T>(...refs: [OptRef<T>, OptRef<T>, ...Array<OptRef<T>>]): Ref<T> {
    if (refs.length === 2) {
        return composePair(refs[0], refs[1]) ?? null;
    }
    return refs.slice(1).reduce<OptRef<T>>((acc, ref) => composePair(acc, ref), refs[0]) ?? null;
}

const cache = new WeakMap<object, WeakMap<object, Ref<unknown>>>();

function composePair<T>(a: OptRef<T>, b: OptRef<T>): OptRef<T> {
    if (!a) return b;
    if (!b) return a;

    const keyA = a as object,
        keyB = b as object;

    let inner = cache.get(keyA);
    if (!inner) cache.set(keyA, (inner = new WeakMap()));

    let composed = inner.get(keyB) as Ref<T> | undefined;
    if (!composed) {
        composed = (value: T | null) => {
            assignRef(a, value);
            assignRef(b, value);
        };
        inner.set(keyB, composed as Ref<unknown>);
    }
    return composed;
}

function assignRef<T>(ref: NonNullable<Ref<T>>, value: T | null): void {
    if (typeof ref === 'function') {
        ref(value);
    } else {
        (ref as MutableRefObject<T | null>).current = value;
    }
}

//---------------------
// Hook variants
//---------------------
/**
 * Compose two or more refs into a single callback ref, with identity managed by `useCallback` and
 * keyed on the input refs. The preferred form within component render functions - see
 * `composeRefs` for the non-hook variant, required where hooks are unavailable (conditional
 * composition, cloned children, render props).
 *
 * Nullish inputs are skipped. React 19 ref-callback cleanups are forwarded: if any input callback
 * returns a cleanup, the composed callback returns a combined cleanup, so React invokes cleanups
 * on detach rather than calling back with `null`. Inputs without their own cleanup still get the
 * legacy null-assignment.
 */
export function useComposedRefs<T>(...refs: [OptRef<T>, OptRef<T>, ...Array<OptRef<T>>]): Ref<T> {
    return useCallback((value: T | null) => {
        const cleanups = refs.map(ref => (ref ? attachRef(ref, value) : undefined));

        if (cleanups.some(Boolean)) {
            return () => {
                refs.forEach((ref, idx) => {
                    const cleanup = cleanups[idx];
                    if (cleanup) cleanup();
                    else if (ref) attachRef(ref, null);
                });
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, refs);
}

/** Assign a value to a ref, returning any cleanup provided by a React 19 ref callback. */
function attachRef<T>(ref: NonNullable<Ref<T>>, value: T | null): (() => void) | undefined {
    if (typeof ref === 'function') {
        const ret = ref(value);
        return typeof ret === 'function' ? ret : undefined;
    }
    (ref as RefObject<T | null>).current = value;
    return undefined;
}
