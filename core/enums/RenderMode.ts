/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Options for how contents should be rendered by their parent container.
 * Used by {@link TabContainerModel}, {@link DashContainerModel}, and {@link PanelModel}.
 */
export const RenderMode = Object.freeze({
    /** Always render contents when the parent container is rendered, even if inactive. */
    ALWAYS: 'always',

    /** Render contents lazily or "just in time" - only if/when the content is first activated. */
    LAZY: 'lazy',

    /** Render lazily, and actively unmount the contents if/when de-activated. */
    UNMOUNT_ON_HIDE: 'unmountOnHide'
});

// eslint-disable-next-line
export type RenderMode = (typeof RenderMode)[keyof typeof RenderMode];
