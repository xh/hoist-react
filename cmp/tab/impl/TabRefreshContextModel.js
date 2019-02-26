/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {RefreshContextModel} from '@xh/hoist/core';
import {TabRefreshMode} from '@xh/hoist/enums';

/**
 * @private
 */
export class TabRefreshContextModel extends RefreshContextModel {

    tabModel;

    constructor(tabModel)  {
        super();
        this.tabModel = tabModel;
        this.addReaction({
            track: () => tabModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async refreshAsync({isAutoRefresh = false} = {}) {
        const {tabModel} = this,
            mode = tabModel.refreshMode;

        if (tabModel.isActive || mode == TabRefreshMode.ALWAYS) {
            return super.refreshAsync({isAutoRefresh});
        }

        if (mode == TabRefreshMode.ON_SHOW_LAZY) {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.tabModel.refreshMode;
            if (mode == TabRefreshMode.ON_SHOW_ALWAYS) {
                super.refreshAsync();
            } else if (mode == TabRefreshMode.ON_SHOW_LAZY && this.refreshPending) {
                this.refreshPending = false;
                super.refreshAsync();
            }
        }
    }
}