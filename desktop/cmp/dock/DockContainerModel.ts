/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, RefreshMode, RenderMode, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {isOmitted} from '@xh/hoist/utils/impl';
import {DockViewModel, DockViewConfig} from './DockViewModel';

interface DockContainerConfig {
    /** DockViewModel configs to be displayed. */
    views?: DockViewConfig[];
    /** Direction in which docked views build up as they are added to the container. */
    direction?: DockViewDirection;
    /** Strategy for rendering DockViews. Can also be set per-view via `DockViewModelConfig.renderMode` */
    renderMode?: RenderMode;
    /** Strategy for refreshing DockViews. Can also be set per-view via `DockViewModelConfig.refreshMode` */
    refreshMode?: RefreshMode;
}

/**
 * Model for a DockContainer, representing its contents.
 *
 * This object provides support for managing docked views, adding new views on the fly,
 * and expanding / collapsing views programmatically.
 */
export class DockContainerModel extends HoistModel {
    @managed @observable.ref views: DockViewModel[] = [];
    direction: DockViewDirection;
    renderMode: RenderMode;
    refreshMode: RefreshMode;

    constructor({
        views = [],
        direction = 'rtl',
        renderMode = 'lazy',
        refreshMode = 'onShowLazy'
    }: DockContainerConfig = {}) {
        super();
        makeObservable(this);
        views = views.filter(v => !isOmitted(v));

        ensureUniqueBy(views as [], 'id', 'Multiple DockContainerModel views have the same id.');
        throwIf(!['ltr', 'rtl'].includes(direction), 'Unsupported value for direction.');

        this.views = views.map(v => new DockViewModel({...v, containerModel: this}));
        this.direction = direction;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
    }

    getView(id: string): DockViewModel {
        return this.views.find(it => it.id === id);
    }

    @action
    addView(cfg: DockViewConfig) {
        const {id} = cfg;
        if (id && this.getView(id)) this.removeView(id);
        this.views = [new DockViewModel({...cfg, containerModel: this}), ...this.views];
    }

    @action
    removeView(id: string) {
        const view = this.getView(id);
        if (view) XH.safeDestroy(view);
        this.views = this.views.filter(it => it.id !== id);
    }

    expandView(id: string) {
        const view = this.getView(id);
        if (view) view.expand();
    }

    collapseView(id: string) {
        const view = this.getView(id);
        if (view) view.collapse();
    }
}

type DockViewDirection = 'ltr' | 'rtl';
