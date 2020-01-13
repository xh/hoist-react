/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Options for how tab contents should be rendered by their parent container. A key feature of
 * TabContainer and DashContainer is that they will by default render child tabs lazily,
 * only when activated for the first time (LAZY)
 *
 * @enum {RenderMode}
 */
export const RenderMode = Object.freeze({

    /** Always render contents when the parent container is rendered, even if inactive. */
    ALWAYS: 'always',

    /** Render contents lazily or "just in time" - only if/when the tab is first activated. */
    LAZY: 'lazy',

    /** Render lazily, and actively unmount the contents if/when de-activated. */
    UNMOUNT_ON_HIDE: 'unmountOnHide'

});

/**
 * @typedef {string} RenderMode
 */
