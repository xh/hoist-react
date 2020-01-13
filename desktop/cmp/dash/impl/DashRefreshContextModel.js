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

    dashViewModel;

    constructor(dashViewModel)  {
        this.dashViewModel = dashViewModel;
        this.addReaction({
            track: () => dashViewModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {dashViewModel} = this,
            mode = dashViewModel.refreshMode;

        if (dashViewModel.isActive || mode == RefreshMode.ALWAYS) {
            return await loadAllAsync(this.refreshTargets, loadSpec);
        }

        if (mode == RefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.dashViewModel.refreshMode;
            if (mode == RefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode == RefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}