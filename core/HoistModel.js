/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {EventSupport, ReactiveSupport, ManagedSupport, XhIdSupport} from './mixins';
import {defaultMethods, markClass} from '@xh/hoist/utils/js';


/**
 * Core decorator for State Models in Hoist.
 *
 * All State models in Hoist applications should typically be decorated with this function.
 * Adds support for managed events and mobx reactivity.
 */
export function HoistModel(C) {
    markClass(C, 'isHoistModel');

    C = ManagedSupport(C);
    C = EventSupport(C);
    C = ReactiveSupport(C);
    C = XhIdSupport(C);

    defaultMethods(C, {

        /**
         * Load or compute new / updated data for this model.
         *
         * @param {Object} [c]
         * @param {boolean} [c.isRefresh] - true if this load was triggered by a refresh.
         * @param {boolean} [c.isAutoRefresh] - true if this load was triggered by a programmatic
         *      refresh process, rather than a user action.
         */
        loadAsync({isRefresh = false, isAutoRefresh = false} = {}) {

        },

        /**
         * Refresh this model.
         *
         * This method delegates to loadAsync() and should not typically be overridden/implemented.
         * Instances of HoistModel should implement loadAsync() instead.
         *
         * @param {Object} [c]
         * @param {boolean} [c.isAutoRefresh] - true if this load was triggered by a programmatic
         *      refresh process, rather than a user action.
         */
        refreshAsync({isAutoRefresh = false} = {}) {
            return this.loadAsync({isAutoRefresh, isRefresh: true});
        }
    });

    return C;
}
