/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed, action, observable} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';

/**
 * Model for a TabPane, representing its content's active load state.
 */
export class TabPaneModel {
    id = null;
    componentClass = null;
    parent = null;

    @observable lastLoaded = null;
    loadState = new LastPromiseModel();

    constructor(id, componentClass) {
        this.id = id;
        this.componentClass = componentClass;
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