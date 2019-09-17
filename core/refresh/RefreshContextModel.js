/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {loadAllAsync}  from '../';
import {throwIf, applyMixin} from '@xh/hoist/utils/js';
import {pull} from 'lodash';
import {HoistModel, LoadSupport}  from '@xh/hoist/core';


/**
 * A model to manage refreshing sections of the application, where "refreshing" refers to app-
 * specific actions to load and display updated data. Calling `refreshAsync()` on this model will
 * refresh all linked models underneath its corresponding component hierarchy.
 *
 * An instance of this class is provided by the framework as `XH.refreshContextModel` and
 * installed at the top level of the application's component hierarchy, allowing for an "app-wide"
 * refresh trigger via `XH.refreshAppAsync()`.
 *
 * Apps can create additional sub-contexts using a `RefreshContextView` paired with this model if
 * they need to coordinate refreshes within a more targeted sections of their UI.
 *
 * HoistModels declared with the `@LoadSupport` decorator are the primary targets for the refresh
 * calls made by this class. LoadSupport-enabled models are auto-linked to the nearest
 * RefreshContextModel when their HoistComponent is mounted.
 *
 * (Note that models must be "owned" by their Component to be auto-linked in this way - meaning they
 * must be internally created by the Component, either directly or from a config passed via props.)
 *
 * Note that TabContainer automatically establishes separate refresh contexts for its tabs and uses
 * these to implement efficient refresh handling of inactive and not-yet-rendered tabs. See the
 * `refreshMode` configs on `TabContainerModel` and `TabModel` for more information on this common
 * use case.
 *
 * @see ModelProvider
 * @see RootRefreshContextModel
 */
export function RefreshContextModel(C) {
    return applyMixin(C, {
        name: 'RefreshContextModel',
        includes: [HoistModel, LoadSupport],

        defaults: {

            async doLoadAsync(loadSpec) {
                return loadAllAsync(this.refreshTargets, loadSpec);
            },

            /** Targets registered for refresh. */
            refreshTargets: {
                get() {
                    if (!this._refreshTargets) this._refreshTargets = [];
                    return this._refreshTargets;
                }
            },

            /**
             * Register a target with this model for refreshing.
             *
             * Not typically called directly by applications.  Hoist will automatically register
             * HoistModels marked with LoadSupport when their owning Component is first mounted.
             *
             * @param {Object} target
             */
            register(target) {
                throwIf(
                    !target.isLoadSupport,
                    'Object must apply the LoadSupport decorator to be registered with a RefreshContextModel.'
                );
                const {refreshTargets} = this;
                if (!refreshTargets.includes(target)) refreshTargets.push(target);
            },

            /**
             * Unregister a target from this model.
             * @param {Object} target
             */
            unregister(target) {
                pull(this.refreshTargets, target);
            }
        }
    });
}