/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isPlainObject} from 'lodash';

import {DashRefreshContextModel} from './DashRefreshContextModel';

/**
 * Model for a DashTab within a DashContainer. Specifies the actual content (child component)
 * to be rendered within the tab and manages that content's render state and refreshes.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * DashViewSpec for it via the `DashContainerModel.viewSpecs` constructor config.
 *
 * @private
 */
@HoistModel
export class DashTabModel {

    id;
    viewSpec;
    @bindable isActive;

    containerModel;
    @managed contentModel;
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
     * @param {string} id - Typically created by GoldenLayout.
     * @param {DashViewSpec} viewSpec - DashViewSpec used to create this DashTab.
     * @param {DashContainerModel} containerModel - parent DashContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {Object} [state] - State with which to initialize the view
     */
    constructor({
        id,
        viewSpec,
        containerModel,
        state
    }) {
        throwIf(!id, 'DashTabModel requires an id');
        throwIf(!viewSpec, 'DashTabModel requires an DashViewSpec');

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

    getState() {
        if (!this.contentModel || !isFunction(this.contentModel.getState)) return;
        const state = this.contentModel.getState();
        throwIf(!isPlainObject(state), 'DashViewSpec getState() must return an object');
        return state;
    }

    setState(state) {
        if (!this.contentModel || !isFunction(this.contentModel.setState)) return;
        this.contentModel.setState(state);
    }

}