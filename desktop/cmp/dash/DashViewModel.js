/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {pickBy, isNil} from 'lodash';

import {DashRefreshContextModel} from './impl/DashRefreshContextModel';

/**
 * Model for a content item within a DashContainer. Supports state management,
 * a refresh context, and active state.
 *
 * This model is not created directly within applications. Instead, specify a
 * DashViewSpec for via the `DashContainerModel.viewSpecs` constructor config.
 * Individual instances of this will then be loaded dynamically from user state
 * or user actions.
 *
 * Content hosted within this view can use this model at runtime to access and set state
 * for the view or access other information.
 */
@HoistModel
export class DashViewModel {

    id;
    viewSpec;
    containerModel;

    @observable.ref viewState;
    @bindable isActive;

    @managed refreshContextModel;

    get renderMode() {
        return this.viewSpec.renderMode || this.containerModel.renderMode;
    }

    get refreshMode() {
        return this.viewSpec.refreshMode || this.containerModel.refreshMode;
    }

    /**
     * @param {string} id - Typically created by GoldenLayouts.
     * @param {DashViewSpec} viewSpec - DashViewSpec used to create this DashTab.
     * @param {Object} viewState - State with which to initialize the view
     * @param {DashContainerModel} containerModel - parent DashContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     */
    constructor({
        id,
        viewSpec,
        viewState = null,
        containerModel
    }) {
        throwIf(!id, 'DashTabModel requires an id');
        throwIf(!viewSpec, 'DashTabModel requires an DashViewSpec');

        this.id = id;
        this.viewSpec = viewSpec;
        this.viewState = viewState;
        this.containerModel = containerModel;

        this.refreshContextModel = new DashRefreshContextModel(this);
    }

    setTitle(title) {
        this.setViewStateKey('title', title);
    }

    setIcon(icon) {
        this.setViewStateKey('icon', icon);
    }

    /**
     * Modify a single key on this model's viewState
     */
    setViewStateKey(key, value) {
        this.setViewState({...this.viewState, [key]: value});
    }

    /**
     * Overwrite viewState, preserving any existing title or icon
     */
    @action
    setViewState(viewState) {
        const {title, icon} = this.viewState ?? {},
            newState = {title, icon, ...viewState};
        this.viewState = pickBy(newState, v => !isNil(v));
    }

}