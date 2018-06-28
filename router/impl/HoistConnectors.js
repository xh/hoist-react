/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * A Router5 Plugin to connect Router5 to an observable RouterModel.
 * @private
 */
export function hoistPlugin(routerModel) {
    const ret = (router) => {
        return {
            onTransitionError: (toState) => {
                console.debug('Error going to:', toState);
            },

            onTransitionSuccess: (toState) => {
                routerModel.setCurrentState(toState);
            }
        };
    };
    ret.pluginName = 'HOIST_ROUTER5_MOBX_PLUGIN';
    return ret;
}

/**
 * Middleware for tracking loading.
 * @private
 */
export function hoistMiddleware(routerModel) {
    return (router) => (toState, fromState, done) => {
        console.debug('Transitioning - ', fromState, '=>', toState);
        done();
    };
}
