/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, RefreshMode, RenderMode} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';

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

    /** @member {RenderMode} */
    renderMode;

    /** @member {RefreshMode} */
    refreshMode;

    /**
     * @param {Object} [c] - DockContainerModel configuration.
     * @param {Object[]} [c.views] - DockViewModel configs to be displayed.
     * @param {string} [c.direction] - direction in which docked views build up as they are added to
     *      the container. Valid values are 'ltr', 'rtl' - the default of 'rtl' causes the first
     *      view to be docked to the bottom right of the container with each subsequent view docked
     *      to the left of view before it.
     * @param {RenderMode} [c.renderMode] - strategy for rendering DockViews. Can be set
     *      per-tab via `DockViewModel.renderMode`. See enum for description of supported modes.
     * @param {RefreshMode} [c.refreshMode] - strategy for refreshing DockViews. Can be set
     *      per-tab via `DockViewModel.refreshMode`. See enum for description of supported modes.
     */
    constructor({
        views = [],
        direction = 'rtl',
        renderMode = RenderMode.UNMOUNT_ON_HIDE,
        refreshMode = RefreshMode.ON_SHOW_LAZY
    } = {}) {
        views = views.filter(v => !v.omit);

        ensureUniqueBy(views, 'id', 'Multiple DockContainerModel views have the same id.');
        throwIf(!['ltr', 'rtl'].includes(direction), 'Unsupported value for direction.');

        this.views = views.map(v => new DockViewModel({...v, containerModel: this}));
        this.direction = direction;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
    }

    getView(id) {
        return this.views.find(it => it.id === id);
    }

    /**
     * @param {Object} cfg - Config for DockViewModel to be added.
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