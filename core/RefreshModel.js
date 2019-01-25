/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {allSettled, start} from '@xh/hoist/promise';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {throwIf} from '@xh/hoist/utils/js';
import {pull} from 'lodash';

/**
 * Refresh Model.
 *
 * This object controls the refreshing of sections of the application.
 *
 * A global instance of this class is provided by the framework as
 * XH.refreshModel.  Applications may create additional sub-models to apply
 * to individual sections of the graphical hierarchy by the use of nested
 * RefreshViews.
 *
 * Also note that TabContainer establishes seperate RefreshModels for its
 * tabs and uses these to implement efficient refresh handling within its hidden
 * tabs.  See TabContainerModel.refreshMode and TabModel.refreshMode for more
 * information.
 *
 * @see RefreshView
 * @see RefreshSupport
 */
@HoistModel
export class RefreshModel {

    targets = [];

    loadModel = new PendingTaskModel();
    lastRefreshRequested = null;
    lastRefreshCompleted = null;

    refreshAsync({isAutoRefresh = false} = {}) {
        this.lastRefreshRequested = new Date();
        return start(() => {
            return allSettled(this.targets.map(t => t.refreshAsync({isAutoRefresh})));
        }).finally(() => {
            this.lastRefreshCompleted = new Date();
        }).linkTo(
            this.loadModel
        );
    }

    /**
     * Register a HoistModel with this model for refreshing.
     *
     * @param {HoistModel} target
     *
     * For models backing HoistComponents, this method should not need to
     * be called directly.  Use @RefreshSupport instead.
     */
    register(target) {
        throwIf(!target.isHoistModel, 'Cannot register non-HoistModel with RefreshModel.');
        const {targets} = this;
        if (!targets.includes(target)) targets.push(target);
    }

    /**
     * Unregister a HoistModel from this model.
     *
     * @param {HoistModel} target
     *
     * For models backing HoistComponents, this method may not need to
     * be called directly.  Use @RefreshSupport instead.
     */
    unregister(target) {
        pull(this.targets, target);
    }

    destroy() {
        this.targets = null;
        XH.safeDestroy(this.loadModel);
    }
}