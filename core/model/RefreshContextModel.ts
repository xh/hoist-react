/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from './';
import {loadAllAsync, LoadSpec, Loadable} from '../load';
import {pull} from 'lodash';

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
 * HoistModels that enable LoadSupport are the primary targets for the refresh calls made by this
 * class. Such models are auto-linked to the nearest RefreshContextModel when their associated
 * component is mounted.
 *
 * (Note that models must be "owned" by their Component to be auto-linked in this way - meaning they
 * must be internally created by the Component, either directly or from a config passed via props.)
 *
 * Note that TabContainer automatically establishes separate refresh contexts for its tabs and uses
 * these to implement efficient refresh handling of inactive and not-yet-rendered tabs. See the
 * `refreshMode` configs on `TabContainerModel` and `TabModel` for more information on this common
 * use case.
 *
 * @see RootRefreshContextModel
 * @see HoistModel.loadSupport
 */
export class RefreshContextModel extends HoistModel {
    /** Targets registered for refresh. */
    refreshTargets: Loadable[] = [];

    /**
     * Register a target with this model for refreshing.
     *
     * Not typically called directly by applications.  Hoist will automatically register
     * HoistModels that implement loading when their owning Component is first mounted.
     */
    register(target: Loadable) {
        const {refreshTargets} = this;
        if (!refreshTargets.includes(target)) refreshTargets.push(target);
    }

    /**
     * Unregister a target from this model.
     */
    unregister(target: Loadable) {
        pull(this.refreshTargets, target);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        await loadAllAsync(this.refreshTargets, loadSpec);
    }
}
