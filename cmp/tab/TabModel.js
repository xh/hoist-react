/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, ManagedRefreshContextModel} from '@xh/hoist/core';
import {action, bindable, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';

/**
 * Model for a Tab within a TabContainer. Specifies the actual content (child component) to be
 * rendered within a tab and manages that content's active and refresh state.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `TabContainerModel.tabs` constructor config.
 */
export class TabModel extends HoistModel {

    id;
    @observable.ref title;
    @observable.ref icon;
    @bindable tooltip;
    @observable disabled;
    excludeFromSwitcher;
    showRemoveAction;

    containerModel;
    @managed refreshContextModel;

    get isTabModel() {return true}

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID, used by container for locating tabs and generating routes.
     * @param {TabContainerModel} c.containerModel - parent TabContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {ReactElement} [c.title] - display title for the Tab in the container's TabSwitcher.
     * @param {ReactElement} [c.icon] - display icon for the Tab in the container's TabSwitcher.
     * @param {ReactElement} [c.tooltip] - tooltip for the Tab in the container's TabSwitcher.
     * @param {boolean} [c.disabled] - true to disable this tab in the TabSwitcher and block routing.
     * @param {boolean} [c.excludeFromSwitcher] - true to hide this Tab in the TabSwitcher,
     *      but still be able to activate the tab manually or via routing.
     * @param {boolean} [c.showRemoveAction] - display an affordance to allow the user to remove
     *      this tab from its container.
     * @param {(ReactElement|Object|function)} c.content - item to be rendered by this tab - either
     *      a Hoist Component or a function returning a ReactElement (e.g. a Hoist elemFactory).
     * @param {RenderMode} [c.renderMode] - strategy for rendering this tab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     * @param {RefreshMode} [c.refreshMode] - strategy for refreshing this tab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     */
    constructor({
        id,
        containerModel,
        title = startCase(id),
        icon = null,
        tooltip = null,
        disabled = false,
        excludeFromSwitcher = false,
        showRemoveAction = false,
        content,
        refreshMode,
        renderMode,
        xhImpl = false
    }) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        throwIf(showRemoveAction && XH.isMobileApp, 'Removable Tabs not supported in Mobile toolkit.');

        this.id = id.toString();
        this.containerModel = containerModel;
        this.title = title;
        this.icon = icon;
        this.tooltip = tooltip;
        this.disabled = !!disabled;
        this.excludeFromSwitcher = excludeFromSwitcher;
        this.showRemoveAction = showRemoveAction;
        this.content = content;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
        this.refreshContextModel.xhImpl = true;
    }

    activate() {
        this.containerModel.activateTab(this.id);
    }

    /** @return {RenderMode} */
    get renderMode() {
        return this._renderMode ?? this.containerModel.renderMode;
    }

    /** @return {RefreshMode} */
    get refreshMode() {
        return this._refreshMode ?? this.containerModel.refreshMode;
    }

    /** @return {boolean} */
    @computed
    get isActive() {
        return this.containerModel.activeTabId === this.id;
    }

    /** @param {ReactElement} icon */
    @action
    setIcon(icon) {
        this.icon = icon;
    }

    /** @param {ReactElement} title */
    @action
    setTitle(title) {
        this.title = title;
    }

    /** @param {boolean} disabled */
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
