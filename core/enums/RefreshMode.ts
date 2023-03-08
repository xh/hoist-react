/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

/**
 * Options for how content should be refreshed via their built-in RefreshContextModel when they
 * receive a refresh request while inactive/hidden or are (re)activated by their parent container.
 * Used by {@link TabContainerModel} and {@link DashContainerModel}.
 */
export const RefreshMode = Object.freeze({
    /** Always refresh a tab when requested, even if it is inactive (hidden). */
    ALWAYS: 'always',

    /** Note a refresh request for an inactive tab and run refresh if/when tab is next activated. */
    ON_SHOW_LAZY: 'onShowLazy',

    /** Always refresh when tab is activated, regardless of whether or not refresh was requested. */
    ON_SHOW_ALWAYS: 'onShowAlways',

    /** Ignore refresh requests entirely when tab is inactive. Do not auto-refresh when reactivated. */
    SKIP_HIDDEN: 'skipHidden'
});

// eslint-disable-next-line
export type RefreshMode = (typeof RefreshMode)[keyof typeof RefreshMode];
