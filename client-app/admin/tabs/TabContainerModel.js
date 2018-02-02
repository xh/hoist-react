/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed, action, observable, setter} from 'hoist/mobx';

/**
 * Model for a TabContainer, representing its , layout, and currently selected Tab.
 */
export class TabContainerModel {
    id = null;
    vertical = false;
    children = [];

    @setter @observable
    selectedIndex = -1;

    parent = null;   // For sub-tabs only

    @computed get selectedId() {
        const selectedIndex = this.selectedIndex;
        return selectedIndex >= 0 ? this.children[selectedIndex].id : null;
    }
    @action setSelectedId(id) {
        const index = this.children.findIndex(it => it.id === id);
        this.setSelectedIndex(index);
    }

    @computed get isActive() {
        const parent = this.parent;
        return !parent || (parent.selectedId === this.id && parent.isActive);
    }

    constructor(id, orientation, ...children) {
        this.id = id;
        this.vertical = orientation === 'v';
        this.children = children;
        this.selectedIndex = children.length ? 0 : -1;
        children.forEach(child => child.parent = this);
    }
}