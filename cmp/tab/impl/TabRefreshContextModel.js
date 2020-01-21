/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {RefreshContextModel} from '@xh/hoist/core/refresh';
import {loadAllAsync, RefreshMode} from '@xh/hoist/core';

/**
 * @private
 */
@RefreshContextModel
export class TabRefreshContextModel {

    tabModel;

    constructor(tabModel)  {
        this.tabModel = tabModel;
        this.addReaction({
            track: () => tabModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {tabModel} = this,
            mode = tabModel.refreshMode;

        if (tabModel.isActive || mode == RefreshMode.ALWAYS) {
            return await loadAllAsync(this.refreshTargets, loadSpec);
        }

        if (mode == RefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.tabModel.refreshMode;
            if (mode == RefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode == RefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}