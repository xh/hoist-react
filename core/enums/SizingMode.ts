/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

/**
 * Options for how Grids should be sized.
 * @enum {string}
 */
export const SizingMode = Object.freeze({
    TINY: 'tiny',
    COMPACT: 'compact',
    STANDARD: 'standard',
    LARGE: 'large'
});

export type TSizingMode = typeof SizingMode[keyof typeof SizingMode];
