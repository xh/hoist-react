/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Where a popover, menu or tooltip appears relative to its target. The first word is the side of
 * the target, the second the edge it aligns to - e.g. `bottom-left` opens below the target, aligned
 * to its left edge. The `auto` values pick the side with the most room.
 */
export type PopoverPosition =
    | 'auto'
    | 'auto-start'
    | 'auto-end'
    | 'top'
    | 'top-left'
    | 'top-right'
    | 'bottom'
    | 'bottom-left'
    | 'bottom-right'
    | 'left'
    | 'left-top'
    | 'left-bottom'
    | 'right'
    | 'right-top'
    | 'right-bottom';

/**
 * Area a popover stays within when it flips or shifts to fit - `clippingParents` (the default)
 * for the target's nearest clipping ancestors, or specific elements.
 */
export type PopoverBoundary = 'clippingParents' | Element | Element[];
