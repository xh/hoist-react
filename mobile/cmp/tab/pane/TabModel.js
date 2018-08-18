/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {max} from 'lodash';

/**
 * Model for a Tab within a TabContainer, representing its content's active and load state.
 */
@HoistModel()
export class TabModel {
    id = null;
    pageFactory = null;
    pageProps = null;
    reloadOnShow = false;
    label = null;
    icon = null;
    parent = null;

    @observable _lastRefreshRequest = null;
    @observable lastLoaded = null;
    loadState = new PendingTaskModel();

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID within its container.
     * @param {TabContainerModel} c.parent - owner TabContainerModel model.
     * @param {function} c.pageFactory - element factory for page component.
     * @param {Object} [c.pageProps] - props to passed to page upon creation
     * @param {boolean} [c.reloadOnShow] - whether to load fresh data for this tab each time it is selected
     * @param {String} c.label - text to be displayed in the Tabbar.
     * @param {Icon} [c.icon] - icon to be displayed in the Tabbar.
     */
    constructor({
        id,
        parent,
        pageFactory,
        pageProps,
        reloadOnShow,
        label,
        icon
    }) {
        this.id = id;
        this.parent = parent;
        this.pageFactory = pageFactory;
        this.pageProps = pageProps;
        this.reloadOnShow = reloadOnShow;
        this.label = label;
        this.icon = icon;
    }

    @computed
    get isActive() {
        return this.parent.activeTabId === this.id;
    }

    @action
    requestRefresh() {
        this._lastRefreshRequest = Date.now();
    }

    @computed
    get lastRefreshRequest() {
        const parentVal = this.parent && this.parent.lastRefreshRequest;
        return max([parentVal, this._lastRefreshRequest]);
    }

    @computed
    get needsLoad() {
        if (this.isActive) {
            if (!this.loadState.isPending) {
                const {lastRefreshRequest, lastLoaded} = this;
                return (!lastLoaded || (lastRefreshRequest && (lastLoaded < lastRefreshRequest)));
            }
        }
        return false;
    }

    @action
    markLoaded() {
        this.lastLoaded = Date.now();
    }

    destroy() {
        XH.safeDestroy(this.loadState);
    }
}