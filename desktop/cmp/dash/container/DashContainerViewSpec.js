/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';

/**
 * Spec used to generate DashContainerViews and DashContainerViewModels within a
 * {@see DashContainer}.
 *
 * This class is not typically created directly within applications. Instead, specify as plain
 * object configs via the `DashContainerModel.viewSpecs` constructor config.
 */
export class DashContainerViewSpec extends DashViewSpec {

    renderMode;
    refreshMode;

    /**
     * @param {RenderMode} [renderMode] - strategy for rendering this DashContainerView. If null,
     *      will default to its container's mode. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing this DashView. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     */
    constructor({
        renderMode,
        refreshMode,
        ...rest
    }) {
        super(rest);
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
    }
}
