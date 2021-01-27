/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Options controlling treeMode-specific styles (row background highlights and borders) for Grids.
 * @enum {string}
 */
export const TreeStyle = Object.freeze({

    /** Highlight parent nodes in tree */
    HIGHLIGHTS: 'highlights',

    /** Separate groups by placing a border above top level parent nodes */
    BORDERS: 'borders',

    HIGHLIGHTS_AND_BORDERS: 'highlightsAndBorders',

    NONE: 'none'

});


export function getTreeStyleClasses(treeStyle) {
    switch (treeStyle) {
        case TreeStyle.HIGHLIGHTS:
            return 'xh-grid--tree-style-highlights';
        case TreeStyle.BORDERS:
            return 'xh-grid--tree-style-borders';
        case TreeStyle.HIGHLIGHTS_AND_BORDERS:
            return 'xh-grid--tree-style-highlights xh-grid--tree-style-borders';
        case TreeStyle.NONE:
            return null;
        default:
            return null;
    }
}
