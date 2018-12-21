/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';

import {DockViewModel} from '../view/DockViewModel';

@HoistModel
export class DockContainerModel {

    /**
     * DockViewModel included in this dock container.
     * {DockViewModel[]}
     */
    @observable.ref viewModels = [];

    addView(cfg ={}) {
        const exists = this.findView(cfg.id);

        if (exists) {
            this.expandView(cfg.id);
        } else {
            const viewModels = [new DockViewModel(cfg), ...this.viewModels];
            this.setViews(viewModels);
        }
    }

    removeView(id) {
        const viewModels = this.viewModels.filter(it => it.id !== id);
        this.setViews(viewModels);
    }

    expandView(id) {
        const view = this.findView(id);
        if (view) view.expand();
    }

    collapseView(id) {
        const view = this.findView(id);
        if (view) view.collapse();
    }

    findView(id) {
        return this.viewModels.find(it => it.id === id);
    }

    @action
    setViews(viewModels) {
        this.viewModels = viewModels;
    }

    destroy() {
        XH.safeDestroy(this.viewModels);
    }
}