/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, setter, action} from 'hoist/mobx';
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

    @observable currentState;

    /**
     * Router5 Router object implementing the routing state.
     * This is the main entry point for Router5 api calls.
     */
    router = null;

    @action
    setCurrentState(state) {
        this.currentState = state;
    }

    /**
     * Initialize the Router5 routing system.
     *
     * @param routes, array of router 5 route objects.
     *
     * Additional routes may be added
     */
    constructor(routes) {
        const config = {defaultRoute: 'default'};
        
        this.router = createRouter(routes, config)
            .usePlugin(browserPlugin(), hoistPlugin(this))
            .useMiddleware(hoistMiddleware(this));
        this.router.start();
    }
}



