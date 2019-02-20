/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSupport} from '@xh/hoist/core';
import {BaseRefreshContextModel} from '@xh/hoist/core/refresh';
import {TabRefreshMode} from '@xh/hoist/enums';

/**
 * @private
 */
@HoistModel
@LoadSupport
export class TabRefreshContextModel extends BaseRefreshContextModel {

    tabModel;

    constructor(tabModel)  {
        super();
        this.tabModel = tabModel;
        this.addReaction({
            track: () => tabModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async doLoadAsync(loadSpec) {
        const {tabModel} = this,
            mode = tabModel.refreshMode;

        if (tabModel.isActive || mode == TabRefreshMode.ALWAYS) {
            return super.doLoadAsync(loadSpec);
        }

        if (mode == TabRefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.tabModel.refreshMode;
            if (mode == TabRefreshMode.ON_SHOW_ALWAYS) {
                this.refreshAsync();
            } else if (mode == TabRefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                this.refreshAsync();
            }
        }
    }
}