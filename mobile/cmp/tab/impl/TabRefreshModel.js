/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {RefreshModel} from '@xh/hoist/cmp/refresh';

/**
 * @private
 */
export class TabRefreshModel extends RefreshModel {

    tabModel;

    constructor(tabModel)  {
        super();
        this.tabModel = tabModel;
        this.addReaction({
            track: () => tabModel.isActive,
            run: this.noteActiveChanged
        });
    }

    async refreshAsync({isAutoRefresh = false}) {
        const {tabModel} = this,
            mode = tabModel.tabRefreshMode;

        if (tabModel.isActive || mode == 'always') {
            return super.refreshAsync({isAutoRefresh});
        }

        if (mode == 'onShowLazy') {
            this.refreshPending = true;
        }
    }

    noteActiveChanged(isActive) {
        if (isActive) {
            const mode = this.tabModel.tabRefreshMode;
            if (mode == 'onShowAlways') {
                super.refreshAsync();
            } else if (mode == 'onShowLazy' && this.refreshPending) {
                this.refreshPending = false;
                super.refreshAsync();
            }
        }
    }
}