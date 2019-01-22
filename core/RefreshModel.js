/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from './HoistModel';
import {allSettled} from '@xh/hoist/promise';
import {PendingTaskModel} from '@xh/hoist/utils/async';


/**
 * Refresh Model.
 */
@HoistModel
export class RefreshModel {

    targets = new Set();

    loadModel = new PendingTaskModel();
    lastRefreshRequested = null;
    lastRefreshCompleted = null;

    //------------------------------------------
    // Application API
    //------------------------------------------
    async refreshAsync({isAutoRefresh = false}) {
        this.lastRefreshRequested = new Date();
        return XH.try(() => {
            allSettled(this.targets.map(t => t.refreshAsync({isAutoRefresh})));
        }).finally(() => {
            this.lastRefreshCompleted = new Date();
        }).linkTo(
            this.loadModel
        );
    }

    //----------------------------------------
    // Target management
    //-----------------------------------------
    register(target) {
        this.targets.add(target);
    }

    unregister(target) {
        this.targets.delete(target);
    }

    destroy() {
        this.targets = null;
        XH.safeDestroy(this.loadModel);
    }
}