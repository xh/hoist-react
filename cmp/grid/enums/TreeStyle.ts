/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

/**
 * Options controlling treeMode-specific styles (row background highlights and borders) for Grids.
 */
export const TreeStyle = Object.freeze({
    /** Highlight parent nodes in tree */
    HIGHLIGHTS: 'highlights',

    COLORS: 'colors',

    /** Separate groups by placing a border above top level parent nodes */
    BORDERS: 'borders',

    HIGHLIGHTS_AND_BORDERS: 'highlightsAndBorders',

    COLORS_AND_BORDERS: 'colorsAndBorders',

    NONE: 'none'
});

// eslint-disable-next-line
export type TreeStyle = (typeof TreeStyle)[keyof typeof TreeStyle];

export function getTreeStyleClasses(treeStyle) {
    switch (treeStyle) {
        case TreeStyle.HIGHLIGHTS:
            return 'xh-grid--tree-style-highlights';
        case TreeStyle.COLORS:
            return 'xh-grid--tree-style-colors';
        case TreeStyle.BORDERS:
            return 'xh-grid--tree-style-borders';
        case TreeStyle.HIGHLIGHTS_AND_BORDERS:
            return 'xh-grid--tree-style-highlights xh-grid--tree-style-borders';
        case TreeStyle.COLORS_AND_BORDERS:
            return 'xh-grid--tree-style-colors xh-grid--tree-style-borders';
        case TreeStyle.NONE:
            return null;
        default:
            return null;
    }
}
