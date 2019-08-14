/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {RefreshContextModel} from '@xh/hoist/core/refresh';
import {TabRefreshMode} from '@xh/hoist/enums';
import {loadAllAsync} from '@xh/hoist/core';

/**
 * @private
 */
@RefreshContextModel
export class PanelRefreshContextModel {

    panelModel;

    constructor(panelModel)  {
        this.panelModel = panelModel;
        this.addReaction({
            track: () => panelModel.collapsed,
            run: this.noteCollapsedChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {panelModel} = this,
            mode = panelModel.refreshMode;

        if (panelModel.isActive || mode == TabRefreshMode.ALWAYS) {
            return await loadAllAsync(this.refreshTargets, loadSpec);
        }

        if (mode == TabRefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteCollapsedChanged(isActive) {
        if (isActive) {
            const mode = this.panelModel.refreshMode;
            if (mode == TabRefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode == TabRefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}