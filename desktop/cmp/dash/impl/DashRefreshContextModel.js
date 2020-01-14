/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {RefreshContextModel} from '@xh/hoist/core/refresh';
import {RefreshMode} from '@xh/hoist/enums';
import {loadAllAsync} from '@xh/hoist/core';

/**
 * @private
 */
@RefreshContextModel
export class DashRefreshContextModel {

    dashTabModel;

    constructor(dashTabModel)  {
        this.dashTabModel = dashTabModel;
        this.addReaction({
            track: () => dashTabModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {dashTabModel} = this,
            mode = dashTabModel.refreshMode;

        if (dashTabModel.isActive || mode == RefreshMode.ALWAYS) {
            return await loadAllAsync(this.refreshTargets, loadSpec);
        }

        if (mode == RefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.dashTabModel.refreshMode;
            if (mode == RefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode == RefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}