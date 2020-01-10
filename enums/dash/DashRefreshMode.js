/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Options for how DashViews should be refreshed via their built-in RefreshContextModel when they receive
 * a refresh request while inactive/hidden or are (re)activated by their parent DashContainer.
 *
 * @enum {DashRefreshMode}
 * @see {DashContainerModel.refreshMode}
 * @see {DashViewModel.refreshMode}
 */
export const DashRefreshMode = Object.freeze({

    /** Always refresh a view when requested, even if it is inactive (hidden). */
    ALWAYS: 'always',

    /** Note a refresh request for an inactive view and run refresh if/when view is next activated. */
    ON_SHOW_LAZY: 'onShowLazy',

    /** Always refresh when view is activated, regardless of whether or not refresh was requested. */
    ON_SHOW_ALWAYS: 'onShowAlways',

    /** Ignore refresh requests entirely when view is inactive. Do not auto-refresh when reactivated. */
    SKIP_HIDDEN: 'skipHidden'

});

/**
 * @typedef {string} DashRefreshMode
 */
