/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {LastPromiseModel} from '@xh/hoist/promise';
import {startCase} from 'lodash';

/**
 * Model for a Tab within a TabContainer - manages the active and refresh state of its contents.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `TabContainerModel.tabs` constructor config.
 */
@HoistModel()
export class TabModel {
    id;
    title;
    reloadOnShow;

    /** @member {TabContainerModel} */
    containerModel = null;

    @observable lastRefreshRequest = null;
    @observable lastLoaded = null;
    loadState = new LastPromiseModel();

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID, used by container for locating tabs and generating routes.
     * @param {string} [c.title] - display title for the Tab in the container's TabSwitcher.
     * @param {Object} c.content - content to be rendered by this Tab. Component class or a custom
     *      element factory of the form returned by elemFactory.
     * @param {boolean} [c.reloadOnShow] - true to reload data for this tab each time it is activated.
     */
    constructor({
        id,
        title = startCase(id),
        content,
        reloadOnShow = false
    }) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.reloadOnShow = reloadOnShow;
    }

    activate() {
        this.containerModel.activateTab(this.id);
    }

    get isActive() {
        return this.containerModel.activeTabId === this.id;
    }

    /**
     * Require a refresh of all contents when they are next shown.
     */
    @action
    requestRefresh() {
        this.lastRefreshRequest = Date.now();
    }

    //---------------------------
    // Implementation
    //---------------------------
    @computed
    get needsLoad() {
        if (!this.isActive || this.loadState.isPending) return false;

        const {lastLoaded, lastRefreshRequest} = this;
        return (!lastLoaded || (lastRefreshRequest && (lastLoaded < lastRefreshRequest)));
    }

    @action
    markLoaded() {
        this.lastLoaded = Date.now();
    }

    destroy() {
        XH.safeDestroy(this.loadState);
    }
}
