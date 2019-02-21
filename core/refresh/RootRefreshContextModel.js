/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, loadAllAsync}  from '@xh/hoist/core';
import {RefreshContextModel} from './RefreshContextModel';

/**
 * Top-level refresh context model.
 *
 * This model will provide a full refresh of the app, including a phased refresh
 * of built-in hoist services, applications services, and displayed HoistModels, respectively.
 *
 * An instance of this object is provided by the framework as `XH.refreshContextModel`.
 */
@RefreshContextModel
export class RootRefreshContextModel {

    async doLoadAsync(loadSpec) {

        // TODO: Refresh selected hoist services in phases here....
        // await loadAllAsync([XH.configService, XH.prefService], loadSpec);

        await XH.appModel.loadAsync(loadSpec);
        await loadAllAsync(this.refreshTargets, loadSpec);
    }
}