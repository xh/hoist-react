/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action} from 'mobx';

class AppStore {
    @observable activeTabId = 'Services';
    @observable lastRefreshRequest = null;

    @action
    changeTab = (tabId) => {
        this.activeTabId = tabId;
    }

    @action
    requestRefresh = () => {
        this.lastRefreshRequest = Date.now();
    }
}

export const appStore = new AppStore();