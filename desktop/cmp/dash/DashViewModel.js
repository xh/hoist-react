/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, ManagedRefreshContextModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

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
export class DashViewModel extends HoistModel {

    id;
    viewSpec;
    containerModel;

    @bindable.ref icon;
    @bindable title;
    @bindable.ref viewState;
    @bindable isActive;

    @managed refreshContextModel;

    get renderMode() {
        return this.viewSpec.renderMode ?? this.containerModel.renderMode;
    }

    get refreshMode() {
        return this.viewSpec.refreshMode ?? this.containerModel.refreshMode;
    }

    /**
     * @param {string} id - Typically created by GoldenLayouts.
     * @param {DashViewSpec} viewSpec - DashViewSpec used to create this view.
     * @param {Element} [icon] - Icon with which to initialize the view
     * @param {string} [title] - Title with which to initialize the view
     * @param {Object} [viewState] - State with which to initialize the view
     * @param {DashContainerModel} containerModel - parent DashContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     */
    constructor({
        id,
        viewSpec,
        icon,
        title,
        viewState = null,
        containerModel
    }) {
        super();
        makeObservable(this);
        throwIf(!id, 'DashViewModel requires an id');
        throwIf(!viewSpec, 'DashViewModel requires an DashViewSpec');

        this.id = id;
        this.viewSpec = viewSpec;
        this.icon = icon ?? viewSpec.icon;
        this.title = title ?? viewSpec.title;
        this.viewState = viewState;
        this.containerModel = containerModel;
        this.refreshContextModel = new ManagedRefreshContextModel(this);
    }

    /**
     * Modify a single key on this model's viewState
     */
    setViewStateKey(key, value) {
        this.setViewState({...this.viewState, [key]: value});
    }

}
