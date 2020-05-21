/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Mode for Grid governing Autosize behavior.
 *
 * @enum {GridAutosizeMode}
 */
export const GridAutosizeMode = Object.freeze({

    /** Grid will not allow autosizing of columns.*/
    DISABLED: 'disabled',

    /**
     * Grid will offer affordances such as context menus and gestures to allow users to manually
     * trigger an autosize only.  Applications should trigger with autosizeAsync().
     */
    ON_DEMAND: 'onDemand'

    // COMING SOON
    // /**
    //  *  Grid will autosize columns when data is *first* loaded into a grid.   Persisted grids
    //  * will only resize again if GridModel's sizingMode subsequently changes.
    //  */
    // ON_FIRST_LOAD: 'onFirstLoad'

});

/**
 * @typedef {string} GridAutosizeMode
 */
