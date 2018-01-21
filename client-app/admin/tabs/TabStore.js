/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {computed} from 'hoist/mobx';

/**
 * Model for a Tab, representing its contents active load state.
 */
export class TabStore {
    id = null;
    componentClass = null;
    parent = null;

    constructor(id, componentClass) {
        this.id = id;
        this.componentClass = componentClass;
    }

    @computed get isActive() {
        return this.parent.selectedId === this.id && this.parent.isActive;
    }
}