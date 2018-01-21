/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed, action, observable} from 'hoist/mobx';

/**
 * Store for a TabSet, representing its items, layout, and currently selected Tab.
 */
export class TabSetStore {
    id = null;
    orientation = 'v';
    children = [];

    @observable
    selectedId = null;

    parent = null;   // For sub-tabs only

    @computed get isActive() {
        const parent = this.parent;
        return !parent || (parent.selectedId === this.id && parent.isActive);
    }

    constructor(id, orientation, ...children) {
        this.id = id;
        this.orientation = orientation;
        this.children = children;
        this.selectedId = children.length ? children[0].id : null;
        children.forEach(child => child.parent = this);
    }

    @action
    changeTab = (id) => {
        this.selectedId = id;
    }
}