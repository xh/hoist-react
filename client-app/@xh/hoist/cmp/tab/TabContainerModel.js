/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/app';
import {computed, action, observable} from 'hoist/mobx';
import {max} from 'lodash';

/**
 * Model for a TabContainer, representing its layout/contents and currently selected TabPane.
 *
 * This TabContainer also supports managed loading and refreshing of its TabPanes.  In particular,
 * TabPanes will be laziliy instantiated, and can also be lazily refreshed.
 *
 * See also TabPaneModel.
 */
export class TabContainerModel {
    id = null;
    vertical = false;
    children = [];

    @observable _lastRefreshRequest = null;
    @observable selectedIndex = -1;

    parent = null;   // For sub-tabs only

    @computed
    get selectedId() {
        const selectedIndex = this.selectedIndex;
        return selectedIndex >= 0 ? this.children[selectedIndex].id : null;
    }

    @action
    setSelectedId(id) {
        const index = this.children.findIndex(it => it.id === id);
        this.setSelectedIndex(index);
    }

    @action
    setSelectedIndex(index) {
        if (index >= this.children.length || index < -1)  {
            throw XH.exception('Incorrect Index for TabContainerModel');
        }
        this.selectedIndex = index;
    }

    @computed
    get isActive() {
        const parent = this.parent;
        return !parent || (parent.selectedId === this.id && parent.isActive);
    }

    @action
    setLastRefreshRequest(timestamp) {
        this._lastRefreshRequest = timestamp;
    }

    @computed
    get lastRefreshRequest() {
        const parentVal = this.parent && this.parent.lastRefreshRequest;
        return max([parentVal, this._lastRefreshRequest]);
    }


    constructor(id, orientation, ...children) {
        this.id = id;
        this.vertical = orientation === 'v';
        this.children = children;
        this.selectedIndex = children.length ? 0 : -1;
        children.forEach(child => child.parent = this);
    }
}