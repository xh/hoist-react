/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Standardized sizes used by Grid - affects padding, row heights, font sizes, etc.
 */
export const SizingMode = Object.freeze({
    TINY: 'tiny',
    COMPACT: 'compact',
    STANDARD: 'standard',
    LARGE: 'large'
});

// eslint-disable-next-line
export type SizingMode = (typeof SizingMode)[keyof typeof SizingMode];
