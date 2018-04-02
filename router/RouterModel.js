/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from 'hoist/mobx';
import createRouter from 'router5';
import browserPlugin from 'router5/plugins/browser';
import {hoistPlugin, hoistMiddleware} from './impl/HoistConnectors';


/**
 * Top-level model for managing routing in hoist.
 *
 * This observable model uses router5 to manage the underlying routes,
 * presenting them to the application as a set of mobx observables.
 */
export class RouterModel {

    /**
     * Router5 state object representing the current state.
     */
    @observable currentState;

    /**
     * Underlying Router5 Router object implementing the routing state.
     *
     * Applications should use this property to directly access the Router5 API.
     */
    router = null;

    /**
     * Initialize this object, and the underlying Router5 routing system.
     *
     * @param routes, array of router 5 route objects.
     */
    init(routes) {
        const config = {defaultRoute: 'default'};

        this.router = createRouter(routes, config)
            .usePlugin(browserPlugin(), hoistPlugin(this))
            .useMiddleware(hoistMiddleware(this))
            .start();
    }

    /**
     * Navigate
     *
     * This is a convenience short cut for router.navigate().  See
     * the Router5 documentation for more information.
     */
    navigate(...args) {
        this.router.navigate(...args);
    }

    //-------------------------
    // Implementation
    //-------------------------
    /**
     * Set the current routing state.  
     *
     * @param state, Router5 State object.
     *
     * Not for use by applications.  This is used for implementing
     * the connection between this object and the router5 system.
     */
    @action
    setCurrentState(state) {
        this.currentState = state;
    }
}