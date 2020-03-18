/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

export function filterMenuSeperators(arr) {
    return arr.filter((it, idx, arr) => {
        if (it === '-' || it.type.name === 'MenuDivider') {
            // Remove starting / ending separators
            if (idx === 0 || idx === (arr.length - 1)) return false;

            // Remove consecutive separators
            const prev = idx > 0 ? arr[idx - 1] : null;
            if (prev?.type.name === 'MenuDivider' || prev === '-') return false;
        }
        return true;
    });
}