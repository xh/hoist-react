/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {autorun, computed, action, observable} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';
import {kebabCase} from 'lodash';
import {wait} from 'hoist/promise';
import {every} from 'lodash';

/**
 * Model for a TabPane, representing its content's active load state.
 */
export class TabPaneModel {
    id = null;
    route = null;
    componentClass = null;
    parent = null;

    @observable lastLoaded = null;
    loadState = new LastPromiseModel();

    constructor(id, componentClass) {
        this.id = id;
        this.route = kebabCase(id);
        this.componentClass = componentClass;

        wait(1).then(() => {
            autorun(() => {
                this.onRouteChange(XH.appModel.route);
            });
            autorun(() => {
                this.onActiveChange(this.isActive);
            });
        });
    }

    onRouteChange(route) {
        // Check route matches this tab, taking in account
        // nested levels of tab containers
        if (!route) return;
        const routeParts = route.split('/'),
            path = this.getRoutePath(),
            match = every(routeParts, (route, idx) => {
                return route === path[idx].route;
            });

        if (!match) return;

        // Loop through tab containers, setting selected ids
        path.forEach(it => {
            it.parent.setSelectedId(it.id);
        });
    }

    onActiveChange(active) {
        // Match route to this tab when it becomes active
        if (!active) return;
        const route = this.getRoutePath().map(it => it.route).join('/');
        window.location.hash = route;
    }

    getRoutePath() {
        const ret = [];
        let target = this; // eslint-disable-line consistent-this
        while (target.parent) {
            ret.unshift(target);
            target = target.parent;
        }
        return ret;
    }

    @computed
    get isActive() {
        return this.parent.selectedId === this.id && this.parent.isActive;
    }

    @computed
    get lastRefreshRequest() {
        return this.parent.lastRefreshRequest;
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
}