/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Options for how Tabs should be refreshed via their built-in RefreshContextView when hidden
 * and activated / reactivated by a parent TabContainer.
 * @enum {TabRefreshMode}
 * @see {TabContainerModel.refreshMode}
 * @see {TabModel.refreshMode}
 */
export const TabRefreshMode = Object.freeze({

    /** Always refresh when requested, even if tab is hidden. */
    ALWAYS: 'always',

    /** Note a refresh request for a hidden tab and run refresh if/when tab is next activated. */
    ON_SHOW_LAZY: 'onShowLazy',

    /** Always refresh when tab is activated, regardless of whether or not refresh was requested. */
    ON_SHOW_ALWAYS: 'onShowAlways',

    /** Drop refresh requests for hidden tabs completely. */
    SKIP_HIDDEN: 'skipHidden'

});

/**
 * @typedef {string} TabRefreshMode
 */
