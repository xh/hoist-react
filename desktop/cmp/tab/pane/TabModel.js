/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, computed, observable} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {throwIf} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';

/**
 * Model for a Tab within a TabContainer - manages the active and refresh state of its contents.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `TabContainerModel.tabs` constructor config.
 */
@HoistModel
export class TabModel {
    id;
    @bindable title;
    @observable disabled;
    @bindable excludeFromSwitcher;
    reloadOnShow;

    /** @member {TabContainerModel} */
    containerModel = null;

    @observable lastRefreshRequest = null;
    @observable lastLoaded = null;
    loadState = new PendingTaskModel();

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID, used by container for locating tabs and generating routes.
     * @param {string} [c.title] - display title for the Tab in the container's TabSwitcher.
     * @param {string} [c.disabled] - whether this tab should appear disabled in the container's TabSwitcher.
     * @param {string} [c.excludeFromSwitcher] - set to true to hide this Tab in the container's TabSwitcher, but still be able to activate the tab manually or via routing
     * @param {Object} c.content - content to be rendered by this Tab. Component class or a custom
     *      element factory of the form returned by elemFactory.
     * @param {boolean} [c.reloadOnShow] - true to reload data for this tab each time it is activated.
     */
    constructor({
        id,
        title = startCase(id),
        disabled,
        excludeFromSwitcher,
        content,
        reloadOnShow = false
    }) {
        this.id = id;
        this.title = title;
        this.disabled = !!disabled;
        this.excludeFromSwitcher = excludeFromSwitcher;
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

    @action
    setDisabled(disabled) {
        if (disabled && this.isActive) {
            const {containerModel} = this,
                tab = containerModel.tabs.find(tab => tab.id !== this.id && !tab.disabled);

            throwIf(!tab, 'Could not find an enabled tab to activate!');
            containerModel.activateTab(tab.id);
        }

        this.disabled = disabled;
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
