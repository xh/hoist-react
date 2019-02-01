/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {TabRefreshContextModel} from './impl/TabRefreshContextModel';


/**
 * Model for a Tab within a TabContainer, representing its content's active and load state.
 */
@HoistModel
export class TabModel {
    id = null;
    pageFactory = null;
    pageProps = null;
    label = null;
    icon = null;

    containerModel;
    @managed refreshContextModel;

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID within its container.
     * @param {TabContainerModel} c.containerModel - parent TabContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {function} c.pageFactory - element factory for page component.
     * @param {Object} [c.pageProps] - props to passed to page upon creation
     * @param {String} c.label - text to be displayed in the Tabbar.
     * @param {Icon} [c.icon] - icon to be displayed in the Tabbar.
     * @param {TabRefreshMode} [c.refreshMode] - strategy for refreshing this tab. If null, will
     *      default to its container's mode. See the enum for a description of the supported modes.
     */
    constructor({
        id,
        containerModel,
        pageFactory,
        pageProps,
        label,
        icon,
        refreshMode
    }) {
        this.id = id;
        this.containerModel = containerModel;
        this.pageFactory = pageFactory;
        this.pageProps = pageProps;
        this.label = label;
        this.icon = icon;
        this._refreshMode = refreshMode;
        this.refreshContextModel = new TabRefreshContextModel(this);
    }

    get refreshMode() {
        return this._refreshMode || this.containerModel.refreshMode;
    }

    get isActive() {
        return this.containerModel.activeTabId === this.id;
    }
}