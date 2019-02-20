/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {loadAllAsync}  from '../';
import {throwIf} from '@xh/hoist/utils/js';
import {pull} from 'lodash';

export class BaseRefreshContextModel {

    targets = [];

    doLoadAsync(loadSpec) {
        return loadAllAsync(this.targets, loadSpec);
    }

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
            !target.hasLoadSupport,
            'Object must apply the LoadSupport decorator to be registered with a RefreshContextModel.'
        );
        const {targets} = this;
        if (!targets.includes(target)) targets.push(target);
    }

    /**
     * Unregister a target from this model.
     *
     * @param {Object} target
     */
    unregister(target) {
        pull(this.targets, target);
    }
}