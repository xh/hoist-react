/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {EventSupport, ReactiveSupport, RefreshSupport, ManagedSupport, XhIdSupport} from './mixins';
import {markClass, defaultMethods} from '@xh/hoist/utils/js';


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
         * @param {LoadContext}
         */
        loadAsync(loadContext = {}) {

        },

        /**
         * Refresh this model.
         *
         * This method should *not* typically need to be implemented on HoistModel.  This provided method delegates to
         * loadAsync() and most components should typically implement loadAsync() instead.
         *
         * @param {boolean} [isAutoRefresh] - true if this load was triggered by a programmatic
         *      refresh process, rather than a user action.
         */
        refreshAsync(isAutoRefresh) {
            return this.loadAsync({isRefresh: true, isAutoRefresh});
        }
    });

    // Needs to be last to allow refreshAsync impl above to override.
    C = RefreshSupport(C);

    return C;
}

/**
 * @typedef {Object} LoadContext
 * @property {boolean} [isRefresh] - true if this load was triggered by a refresh.
 * @property {boolean} [isAutoRefresh] - true if this load was triggered by a programmatic
 *      refresh process, rather than a user action.
 */

