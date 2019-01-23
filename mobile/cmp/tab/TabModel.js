/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {computed} from '@xh/hoist/mobx';

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
    parent = null;

    refreshModel = new TabRefreshModel(this);

    /**
     * @param {Object} c - TabModel configuration.
     * @param {string} c.id - unique ID within its container.
     * @param {TabContainerModel} c.parent - owner TabContainerModel model.
     * @param {function} c.pageFactory - element factory for page component.
     * @param {Object} [c.pageProps] - props to passed to page upon creation
     * @param {String} c.label - text to be displayed in the Tabbar.
     * @param {Icon} [c.icon] - icon to be displayed in the Tabbar.
     * @param {string} [c.tabRefreshMode] - how to refresh hidden tabs - [always|skipHidden|onShowLazy|onShowAlways].
     */
    constructor({
        id,
        parent,
        pageFactory,
        pageProps,
        reloadOnShow,
        label,
        icon,
        tabRefreshMode
    }) {
        this.id = id;
        this.parent = parent;
        this.pageFactory = pageFactory;
        this.pageProps = pageProps;
        this.label = label;
        this.icon = icon;
        this._tabRefreshMode = tabRefreshMode;
    }

    get tabRefreshMode()    {return this._tabRefreshMode || this.parent.tabRefreshMode}

    @computed
    get isActive() {
        return this.parent && this.parent.activeTabId === this.id;
    }

    destroy() {
        XH.safeDestroy(this.loadState);
    }
}