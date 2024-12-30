/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';
import {RefreshMode, RenderMode} from '@xh/hoist/core';

/**
 * Spec used to generate DashContainerViews and DashContainerViewModels.
 */
export interface DashContainerViewSpec extends DashViewSpec {
    /**
     *  Strategy for rendering this DashContainerView. If null, will default to its container's
     *  mode. See enum for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing this DashView. If null, will default to its container's mode.
     * See enum for description of supported modes.
     */
    refreshMode?: RefreshMode;
}
