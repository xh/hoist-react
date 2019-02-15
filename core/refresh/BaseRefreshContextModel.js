/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {managed, refreshAllAsync}  from '@xh/hoist/core';
import {start} from '@xh/hoist/promise';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {throwIf} from '@xh/hoist/utils/js';
import {pull} from 'lodash';

export class BaseRefreshContextModel {

    targets = [];

    @managed
    loadModel = new PendingTaskModel();

    lastRefreshRequested = null;
    lastRefreshCompleted = null;

    refreshAsync(isAutoRefresh) {
        this.lastRefreshRequested = new Date();
        return start(() => {
            return refreshAllAsync(this.targets, isAutoRefresh);
        }).finally(() => {
            this.lastRefreshCompleted = new Date();
        }).linkTo(
            this.loadModel
        );
    }

    /**
     * Register a target with this model for refreshing.
     *
     * For models backing HoistComponents, consider applying the `@LoadSupport` decorator to
     * the component to have this method called automatically when the component is mounted.
     *
     * @param {HoistModel} target
     */
    register(target) {
        throwIf(!target.hasRefreshSupport, 'HoistModels must apply the @RefreshSupport decorator to be registered with a RefreshContextModel.');
        const {targets} = this;
        if (!targets.includes(target)) targets.push(target);
    }

    /**
     * Unregister a target from this model.
     *
     * @param {HoistModel} target
     */
    unregister(target) {
        pull(this.targets, target);
    }
}