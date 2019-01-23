/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';

import {TabRefreshModel} from './impl/TabRefreshModel';


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

    containerModel = null;
    refreshModel = null;

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID within its container.
     * @param {TabContainerModel} c.containerModel - owner TabContainerModel.
     * @param {function} c.pageFactory - element factory for page component.
     * @param {Object} [c.pageProps] - props to passed to page upon creation
     * @param {String} c.label - text to be displayed in the Tabbar.
     * @param {Icon} [c.icon] - icon to be displayed in the Tabbar.
     * @param {string} [c.tabRefreshMode] - how to refresh hidden tabs - [always|skipHidden|onShowLazy|onShowAlways].
     */
    constructor({
        id,
        containerModel,
        pageFactory,
        pageProps,
        label,
        icon,
        tabRefreshMode
    }) {
        this.id = id;
        this.containerModel = containerModel;
        this.pageFactory = pageFactory;
        this.pageProps = pageProps;
        this.label = label;
        this.icon = icon;
        this._tabRefreshMode = tabRefreshMode;
        this.refreshModel = new TabRefreshModel(this);
    }

    get tabRefreshMode()    {return this._tabRefreshMode || this.containerModel.tabRefreshMode}

    get isActive() {
        return this.containerModel.activeTabId === this.id;
    }

    destroy() {
        XH.safeDestroy(this.loadState, this.refreshModel);
    }
}