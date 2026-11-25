/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {useEffect} from 'react';

/**
 * Classes set on the body while any modal layer is open, which stop the page behind it from
 * scrolling.
 */
const LOCK_CLASSES = ['xh-overlay-open'];

let lockCount = 0;

/** Lock body scroll while `active` is true, counting nested locks. */
export function useBodyScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        if (lockCount++ === 0) document.body.classList.add(...LOCK_CLASSES);
        return () => {
            if (--lockCount === 0) document.body.classList.remove(...LOCK_CLASSES);
        };
    }, [active]);
}
