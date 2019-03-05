/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';

import {TabRefreshContextModel} from './impl/TabRefreshContextModel';

/**
 * Model for a Tab within a TabContainer. Specifies the actual content (child component) to be
 * rendered within a tab and manages that content's active and refresh state.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `TabContainerModel.tabs` constructor config.
 */
@HoistModel
export class TabModel {

    id;
    @bindable title;
    @bindable icon;
    @observable disabled;
    excludeFromSwitcher;

    containerModel;
    @managed refreshContextModel;

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID, used by container for locating tabs and generating routes.
     * @param {TabContainerModel} c.containerModel - parent TabContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {string} [c.title] - display title for the Tab in the container's TabSwitcher.
     * @param {Icon} [c.icon] - display icon for the Tab in the container's TabSwitcher.
     * @param {string} [c.disabled] - true to disable this tab in the TabSwitcher and block routing.
     * @param {string} [c.excludeFromSwitcher] - true to hide this Tab in the TabSwitcher,
     *      but still be able to activate the tab manually or via routing.
     * @param {Object} c.content - content to be rendered by this Tab. Component class or a custom
     *      element factory of the form returned by elemFactory.
     * @param {TabRenderMode} [c.renderMode] - strategy for rendering this tab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     * @param {TabRefreshMode} [c.refreshMode] - strategy for refreshing this tab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     */
    constructor({
        id,
        containerModel,
        title = startCase(id),
        icon,
        disabled,
        excludeFromSwitcher,
        content,
        refreshMode,
        renderMode
    }) {
        this.id = id;
        this.containerModel = containerModel;
        this.title = title;
        this.icon = icon;
        this.disabled = !!disabled;
        this.excludeFromSwitcher = excludeFromSwitcher;
        this.content = content;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new TabRefreshContextModel(this);
    }

    activate() {
        this.containerModel.activateTab(this.id);
    }

    get renderMode() {
        return this._renderMode || this.containerModel.renderMode;
    }

    get refreshMode() {
        return this._refreshMode || this.containerModel.refreshMode;
    }
    
    get isActive() {
        return this.containerModel.activeTabId === this.id;
    }
    
    @action
    setDisabled(disabled) {
        if (disabled && this.isActive) {
            const {containerModel} = this,
                tab = containerModel.tabs.find(tab => tab.id !== this.id && !tab.disabled);

            throwIf(!tab, 'Cannot disable last enabled tab.');
            containerModel.activateTab(tab.id);
        }

        this.disabled = disabled;
    }
}
