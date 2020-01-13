/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

import {DashRefreshContextModel} from './impl/DashRefreshContextModel';

/**
 * Model for a DashView within a DashContainer. Specifies the actual content (child component)
 * to be rendered within the view and manages that content's render state and refreshes.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * DashViewSpec for it via the `DashContainerModel.viewSpecs` constructor config.
 */
@HoistModel
export class DashViewModel {

    id;
    viewSpec;
    @bindable isActive;

    contentModel;
    containerModel;
    @managed refreshContextModel;

    get modelLookupContext() {
        return this.containerModel.modelLookupContext;
    }

    get content() {
        return this.viewSpec.content;
    }

    get renderMode() {
        return this.viewSpec.renderMode || this.containerModel.renderMode;
    }

    get refreshMode() {
        return this.viewSpec.refreshMode || this.containerModel.refreshMode;
    }

    /**
     * @param {string} id - Typically created by GoldenLayouts.
     * @param {DashViewSpec} viewSpec - DashViewSpec used to create this DashView.
     * @param {DashContainerModel} containerModel - parent DashContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {Object} [state] - State with which to initialize this DashView
     */
    constructor({
        id,
        viewSpec,
        containerModel,
        state
    }) {
        throwIf(!id, 'DashViewModel requires an id');
        throwIf(!viewSpec, 'DashViewModel requires an DashViewSpec');

        this.id = id;
        this.viewSpec = viewSpec;
        this.containerModel = containerModel;

        // Create content model
        if (isFunction(viewSpec.contentModelFn)) {
            this.contentModel = viewSpec.contentModelFn();
        }

        // Initialise state
        if (state) this.setState(state);

        this.refreshContextModel = new DashRefreshContextModel(this);
    }

    get state() {
        const {getState} = this.viewSpec;
        if (!isFunction(getState)) return null;
        return getState(this.contentModel);
    }

    setState(state) {
        const {setState} = this.viewSpec;
        if (!isFunction(setState)) return;
        return setState(state, this.contentModel);
    }

}