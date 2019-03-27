/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {merge} from 'lodash';
import createRouter from 'router5';
import browserPlugin from 'router5-plugin-browser';

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

    /**
     * Add a routeName to the current route, preserving params
     * @param {String} routeName - the routeName to append
     * @param {Object} newParams - additional params for this routeName to be merged with existing params.
     */
    appendRoute(routeName, newParams = {}) {
        const {name, params} = this.currentState;
        return this.router.navigate(`${name}.${routeName}`, merge({}, params, newParams));
    }

    /**
     * Remove last routeName from the current route, preserving params
     */
    popRoute() {
        const {name, params} = this.currentState,
            match = name.match(/.*(?=\.)/);
        if (!match) return;
        return this.router.navigate(match[0], params);
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

        ret.usePlugin(browserPlugin());
        ret.subscribe(ev => this.setCurrentState(ev.route));

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