/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed, action, observable, autorun} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';
import {startCase} from 'lodash';
import {wait} from 'hoist/promise';

/**
 * Model for a TabPane, representing its content's active and load state.
 */
export class TabPaneModel {
    id = null;
    name = null;
    componentClass = null;
    parent = null;

    @observable lastLoaded = null;
    loadState = new LastPromiseModel();
    
    get routeName() {
        return this.parent.routeName + '.' + this.id;
    }

    /**
     * Construct this object.
     *
     * @param id, String.  Unique id.  Used for generating routes.
     * @param name, String. Display name for the tab.
     * @param component, React Node.  Specifies component to be displayed within tab.
     */
    constructor({
        id,
        name = startCase(id),
        component
    }) {
        this.id = id;
        this.name = name;
        this.componentClass = component;
        wait(1).then(() => autorun(() => this.syncFromRouter()));
    }

    select() {
        this.parent.setSelectedId(this.id);
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

    syncFromRouter() {
        const {parent, id} = this,
            routerModel = XH.routerModel,
            state = routerModel.currentState,
            routeName = state ? state.name : 'default';

        if (routeName.startsWith(this.routeName) && parent.selectedId != id) {
            parent.setSelectedId(id);
        }
    }
}