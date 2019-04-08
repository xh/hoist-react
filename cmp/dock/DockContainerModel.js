/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {uniqBy} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';

import {DockViewModel} from './DockViewModel';

/**
 * Model for a DockContainer, representing its contents.
 *
 * This object provides support for managing docked views, adding new views on the fly,
 * and expanding / collapsing views programmatically.
 */
@HoistModel
export class DockContainerModel {

    /** @member {DockViewModel[]} */
    @managed @observable.ref views = [];

    /** @member {string} */
    direction;

    /**
     * @param {Object} c - DockContainerModel configuration.
     * @param {Object[]} c.views - Configs for DockViewModel to be displayed.
     * @param {string} [c.direction] - For direction for views docked within this component.
     *      Valid values are 'ltr', 'rtl'.
     */
    constructor({
        views,
        direction = 'ltr'
    }) {
        views = views.filter(v => !v.omit);
        throwIf(views.length !== uniqBy(views, 'id').length, 'One or more views in DockContainerModel has a non-unique id.');
        throwIf(!['ltr', 'rtl'].includes(direction), 'Unsupported value for direction.');

        this.direction = direction;
        this.views = views.map(v => new DockViewModel({...v, containerModel: this}));
    }

    getView(id) {
        return this.views.find(it => it.id === id);
    }

    /**
     * @param cfg - Config for DockViewModel to be added.
     */
    @action
    addView(cfg = {}) {
        const {id} = cfg;
        if (id && this.getView(id)) this.removeView(id);
        this.views = [new DockViewModel({...cfg, containerModel: this}), ...this.views];
    }

    @action
    removeView(id) {
        const view = this.getView(id);
        if (view) XH.safeDestroy(view);
        this.views = this.views.filter(it => it.id !== id);
    }

    expandView(id) {
        const view = this.getView(id);
        if (view) view.expand();
    }

    collapseView(id) {
        const view = this.getView(id);
        if (view) view.collapse();
    }

}