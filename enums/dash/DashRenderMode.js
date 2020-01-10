/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Options for how DashViews should be rendered by their parent DashContainer. A key feature of
 * DashContainer is that it will by default render DashViews lazily, only when activated for
 * the first time (LAZY)
 *
 * @enum {DashRenderMode}
 * @see {DashContainerModel.renderMode}
 * @see {DashViewModel.renderMode}
 */
export const DashRenderMode = Object.freeze({

    /** Always render view contents when the parent DashContainer is rendered, even if inactive. */
    ALWAYS: 'always',

    /** Render view contents lazily or "just in time" - only if/when the view is first activated. */
    LAZY: 'lazy',

    /** Render lazily, and actively unmount the view contents if/when de-activated. */
    UNMOUNT_ON_HIDE: 'unmountOnHide'

});

/**
 * @typedef {string} DashRenderMode
 */
