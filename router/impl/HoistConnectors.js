/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * A Router5 Plugin to connect Router5 to an observable RouterModel.
 */
export function hoistPlugin(routerModel) {
    const ret = (router) => {
        return {
            onTransitionError: (toState) => {
                console.log('Not Implemented');
            },

            onTransitionSuccess: (toState) => {
                routingModel.setCurrentState(toState);
            }
        }
    }
    ret.pluginName = 'MOBX_PLUGIN';
    return ret;
}

/**
 * Middleware for tracking loading.
 */
export function hoistMiddleware(routerModel) {
    return (router) => (toState, fromState, done) => {
        console.log(`Transitioning from ${toState} to ${fromState}`);
        done();
    }
}
