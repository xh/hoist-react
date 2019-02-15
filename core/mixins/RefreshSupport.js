/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {defaultMethods, markClass} from '@xh/hoist/utils/js';
import {allSettled} from '@xh/hoist/promise';

/**
 * Mixin to indicate that an object can be refreshed.
 */
export function RefreshSupport(C) {

    markClass(C, 'hasRefreshSupport');

    defaultMethods(C, {
        /**
         * Refresh this object.
         *
         * Implement this method to describe how this object should refresh itself from underlying data sources
         * or services.
         *
         * @param {boolean} [isAutoRefresh] - true if this load was triggered by an automatic
         *      refresh process, rather than a user action.
         */
        refreshAsync(isAutoRefresh = false) {}
    });

    return C;
}

/**
 * Refresh a collection of objects with RefreshSupport in 'parallel'.
 *
 * @param {Object[]} config - list of objects to be refreshed.
 * @param {boolean} [isAutoRefresh] - true if this load was triggered by an automatic
 *      refresh process, rather than a user action.
 *
 * Note that this method uses 'allSettled' in its implementation in order to
 * to avoid a failure of any single call from causing the method to throw.
 */
export async function refreshAllAsync(objs, isAutoRefresh = false) {
    const promises = objs.map(it => it.refreshAsync(isAutoRefresh)),
        ret = await allSettled(promises);

    ret.filter(it => it.state === 'rejected')
        .forEach(err => console.error('Failed to Refresh Object', err.reason));
    return ret;
}
