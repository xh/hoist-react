/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Mode for Grid governing Autosize behavior.
 */
export const GridAutosizeMode = Object.freeze({
    /** Grid will not allow autosizing of columns.*/
    DISABLED: 'disabled',

    /**
     * Grid will offer affordances such as context menus and gestures to allow users to manually
     * trigger an autosize only. Applications should trigger with autosizeAsync().
     */
    ON_DEMAND: 'onDemand',

    /**
     * Grid will autosize columns when the GridModel's sizingMode changes.
     * Also offers the affordances provided by ON_DEMAND.
     */
    ON_SIZING_MODE_CHANGE: 'onSizingModeChange',

    /**
     * Grid will autosize columns when the GridModel's sizingMode changes or data is loaded,
     * unless the user has manually modified their column widths.
     * Also offers the affordances provided by ON_DEMAND.
     */
    MANAGED: 'managed'
});

// eslint-disable-next-line
export type GridAutosizeMode = (typeof GridAutosizeMode)[keyof typeof GridAutosizeMode];
