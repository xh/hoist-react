/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed, action, setter, observable} from 'hoist/mobx';

/**
 * Model for a Tab, representing its content's active load state.
 */
export class TabModel {
    id = null;
    componentClass = null;
    parent = null;

    @setter @observable isLazyMode = true;
    @setter @observable isLoading = false;
    @observable lastLoaded = null;

    constructor(id, componentClass) {
        this.id = id;
        this.componentClass = componentClass;
    }

    @computed
    get isActive() {
        return this.parent.selectedId === this.id && this.parent.isActive;
    }

    @action
    markLoaded() {
        this.setIsLoading(false);
        this.lastLoaded = Date.now();
    }
}