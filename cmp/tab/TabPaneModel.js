/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {LastPromiseModel} from '@xh/hoist/promise';
import {startCase} from 'lodash';

/**
 * Model for a TabPane, representing its content's active and load state.
 */
@HoistModel()
export class TabPaneModel {
    id = null;
    name = null;
    reloadOnShow = false;
    container = null;  // TabContainerModel containing this object.

    @observable lastLoaded = null;
    @observable _lastRefreshRequest = null;
    loadState = new LastPromiseModel();


    get routeName() {
        return `${this.container.routeName}.${this.id}`;
    }

    /**
     * @param {string} id - unique ID, used for generating routes.
     * @param {string} [name] - display name for the tab.
     * @param {Object} content - content to be rendered by this tab. Component class, or a custom element factory of the
     *      form returned by elemFactory.
     * @param {boolean} reloadOnShow - whether to load fresh data for this tab each time it is selected
     */
    constructor({
        id,
        name = startCase(id),
        content,
        reloadOnShow
    }) {
        this.id = id;
        this.name = name;
        this.content = content;
        this.reloadOnShow = reloadOnShow;

        this.addReaction(this.routerReaction());

    }

    select() {
        this.container.setSelectedId(this.id);
    }

    @computed
    get isActive() {
        const {container, id} = this;
        return container.selectedId === id;
    }

    @action
    requestRefresh() {
        this._lastRefreshRequest = Date.now();
    }

    @computed
    get lastRefreshRequest() {
        return this._lastRefreshRequest;
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


    //---------------------------
    // Implementation
    //---------------------------
    routerReaction() {
        const {routerModel} = XH.routerModel,
            {container} = this;

        return {
            track: () => [routerModel, container.selectedId],
            react: () => {
            //    const
            //        routerModel = XH.routerModel,
            //        state = routerModel.currentState,
            //        routeName = state ? state.name : 'default';
            //
            //    if (routeName.startsWith(this.routeName) && parent.selectedId !== id) {
            //        parent.setSelectedId(id);
            //    }
            }
        };
    }

    destroy() {
        XH.safeDestroy(this.loadState);
    }
}
