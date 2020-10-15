/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Options for how grids in tree mode should be style.
 * @enum {string}
 */
export const TreeStyle = Object.freeze({

    /** Highlight parent nodes in tree */
    HIGHLIGHT_GROUPS: 'highlightGroups',

    /** Separate groups by placing a border above top level parent nodes */
    GROUP_BORDERS: 'tree-group-border',

    HIGHLIGHT_GROUPS_WITH_BORDERS: 'highlightGroupsWithBorders',

    NONE: 'none'

});


export function getTreeStyleClasses(treeStyle) {
    switch (treeStyle) {
        case TreeStyle.HIGHLIGHT_GROUPS:
            return 'xh-grid--highlight-tree-groups';
        case TreeStyle.GROUP_BORDERS:
            return 'xh-grid--tree-group-border';
        case TreeStyle.HIGHLIGHT_GROUPS_WITH_BORDERS:
            return 'xh-grid--highlight-tree-groups xh-grid--tree-group-border';
        case TreeStyle.NONE:
            return null;
        default:
            return null;
    }
}