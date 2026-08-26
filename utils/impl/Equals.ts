/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * @internal
 */
export function shallowEqualArrays<T = any>(a: T[], b: T[]): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    const len = a.length;
    if (b.length !== len) return false;
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * @internal
 */
export function shallowEqualObjects(a: Record<string, any>, b: Record<string, any>): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    const keys = Object.keys(a);
    if (Object.keys(b).length !== keys.length) return false;
    for (const key of keys) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}
