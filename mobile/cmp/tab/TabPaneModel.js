/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {LastPromiseModel} from '@xh/hoist/promise';
import {max} from 'lodash';

/**
 * Model for a TabPane, representing its content's active and load state.
 */
@HoistModel()
export class TabPaneModel {
    id = null;
    pageFactory = null;
    pageProps = null;
    reloadOnShow = false;
    label = null;
    icon = null;
    parent = null;

    @observable _lastRefreshRequest = null;
    @observable lastLoaded = null;
    loadState = new LastPromiseModel();

    /**
     * @param {string} id - unique ID.
     * @param {TabContainerModel} parent - owner TabContainerModel model.
     * @param {function} pageFactory - element factory for page component.
     * @param {Object} [pageProps] - props to passed to page upon creation
     * @param {boolean} [reloadOnShow] - whether to load fresh data for this tab each time it is selected
     * @param {String} label - text to be displayed in the Tabbar.
     * @param {Icon} [icon] - icon to be displayed in the Tabbar.
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
        return this.parent.selectedId === this.id;
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