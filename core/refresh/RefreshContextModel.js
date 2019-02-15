/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel}  from '@xh/hoist/core';
import {BaseRefreshContextModel} from './BaseRefreshContextModel';

/**
 * Model to manage refreshing sections of the application, where "refreshing" refers to app-specific
 * actions to load and display updated data. Calling `refreshAsync()` on this model will cause it to
 * trigger a refresh on all linked models within the graphical hierarchy it contains.
 *
 * A global instance of this class is provided by the framework as `XH.refreshContextModel`. Apps
 * can create additional sub-contexts using a RefreshContextView paired with this object.
 *
 * Note that TabContainer automatically establishes separate refresh contexts for its tabs and uses
 * these to implement efficient refresh handling of inactive and not-yet-rendered tabs. See the
 * `refreshMode` configs on `TabContainerModel` and `TabModel` for more information on this common
 * use case.
 *
 * @see RefreshContext
 * @see RefreshContextView
 * @see RootRefreshContextModel
 */
@HoistModel
export class RefreshContextModel extends BaseRefreshContextModel {

}