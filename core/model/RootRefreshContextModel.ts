/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '../';
import {LoadSpec, loadAllAsync} from '../load';
import {RefreshContextModel} from './';

/**
 * Top-level refresh context model - triggers a full refresh of the app via a call to `loadAsync()`
 * on the AppModel, followed by refreshes of any target models within the component hierarchy.
 *
 * An instance of this object is installed and linked by the framework as `XH.refreshContextModel`
 * and should *not* be created or managed by application code.
 *
 * The `XH.refreshAppAsync()` convenience method is the recommended entry-point for apps to call.
 */
export class RootRefreshContextModel extends RefreshContextModel {
    override async doLoadAsync(loadSpec: LoadSpec) {
        const {appModel} = XH;
        if (appModel.loadSupport) {
            await appModel.loadAsync(loadSpec);
        }
        await loadAllAsync(this.refreshTargets, loadSpec);
    }
}
