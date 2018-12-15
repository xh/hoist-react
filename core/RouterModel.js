/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import createRouter from 'router5';
import browserPlugin from 'router5/plugins/browser';

/**
 * Top-level model for managing application routing in Hoist.
 *
 * This observable model uses Router5 (https://router5.js.org/) to manage the
 * underlying routes, presenting them to the application as a set of MobX observables.
 */
@HoistModel
export class RouterModel {

    /** Router5 state object representing the current state. */
    @observable currentState;

    /** Underlying Router5 Router object implementing the routing state. */
    router = this.createRouter();

    /**
     * Does the routing system already have a given route?
     * @param {String} routeName
     */
    hasRoute(routeName) {
        const flatNames = this.getRouteNames(this.router.rootNode);
        return flatNames.includes(routeName);
    }

    /**
     * Add routes to the router.
     *
     * @param {Object[]} routes - collection of router5 route spec.
     *      This method supports an additional keyword 'omit' on each spec, in order to allow declarative
     *      exclusion.  Otherwise these are Router5 configs to be passed directly to the Router5 API.
     */
    addRoutes(routes) {
        this.router.add(this.preprocessRoutes(routes));
    }


    //-------------------------
    // Implementation
    //-------------------------
    @action
    setCurrentState(state) {
        this.currentState = state;
    }

    getRouteNames(node) {
        const name = node.name,
            ret = [];

        node.children.forEach(child => {
            this.getRouteNames(child).forEach(it => {
                ret.push(name ? name + '.' + it : it);
            });
        });

        if (name) ret.push(name);
        return ret;
    }

    createRouter() {
        const ret = createRouter([], {defaultRoute: 'default'});

        ret.usePlugin(browserPlugin())
            .subscribe(ev => this.setCurrentState(ev.route));

        return ret;
    }

    preprocessRoutes(routes) {
        const ret = routes.filter(r => !r.omit);
        ret.forEach(r => {
            if (r.children) r.children = this.preprocessRoutes(r.children);
        });
        return ret;
    }
}