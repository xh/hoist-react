/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Options for how Tab contents should be rendered by their parent TabContainer. A key feature of
 * TabContainer and the Tab system in general is that it will by default render child tabs lazily,
 * only when activated for the first time (LAZY)
 *
 * @enum {TabRenderMode}
 * @see {TabContainerModel.renderMode}
 * @see {TabModel.renderMode}
 */
export const TabRenderMode = Object.freeze({

    /** Always render Tab contents when the parent TabContainer is rendered, even if inactive. */
    ALWAYS: 'always',

    /** Render Tab contents lazily or "just in time" - only if/when the Tab is first activated. */
    LAZY: 'lazy',

    /** Render lazily, and actively unmount the Tab contents if/when de-activated. */
    UNMOUNT_ON_HIDE: 'unmountOnHide'

});

/**
 * @typedef {string} TabRenderMode
 */
