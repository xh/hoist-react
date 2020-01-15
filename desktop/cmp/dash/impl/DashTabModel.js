/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, observable, runInAction} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEqual} from 'lodash';

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
    containerModel;

    @observable.ref viewState;
    @bindable isActive;
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

    setViewStateSource = (fn) => {
        if (fn) {
            this.addReaction({
                track: fn,
                run: (viewState) => {
                    if (!(isEqual(viewState, this.viewState))) {
                        console.log(viewState);
                        runInAction(() => {
                            this.viewState = {...viewState};
                        });
                    }
                },
                fireImmediately: true
            });
        }
    }
}