/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '../core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {merge} from 'lodash';
import {isOmitted} from '@xh/hoist/utils/impl';
import {createRouter, Router, State} from 'router5';
import browserPlugin from 'router5-plugin-browser';

/**
 * Top-level model for managing application routing in Hoist.
 *
 * This observable model uses Router5 (https://router5.js.org/) to manage the
 * underlying routes, presenting them to the application as a set of MobX observables.
 */
export class RouterModel extends HoistModel {
    /** Router5 state object representing the current state. */
    @observable.ref
    currentState: State;

    /** Underlying Router5 Router object implementing the routing state. */
    router: Router = this.createRouter();

    /**
     * Does the routing system already have a given route?
     */
    hasRoute(routeName: string): boolean {
        const flatNames = this.getRouteNames(this.router.rootNode);
        return flatNames.includes(routeName);
    }

    /**
     * Add routes to the router.
     *
     * @param routes - collection of router5 route spec.
     *      This method supports an additional keyword 'omit' on each spec, in order to allow declarative
     *      exclusion.  Otherwise these are Router5 configs to be passed directly to the Router5 API.
     */
    addRoutes(routes: object[]) {
        this.router.add(this.preprocessRoutes(routes));
    }

    /**
     * Add a routeName to the current route, preserving params
     * @param routeName - the routeName to append
     * @param newParams - additional params for this routeName to be merged with existing params.
     */
    appendRoute(routeName: string, newParams: object = {}) {
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

    constructor() {
        super();
        makeObservable(this);
    }

    //-------------------------
    // Implementation
    //-------------------------
    @action
    private setCurrentState(state) {
        this.currentState = state;
    }

    private getRouteNames(node) {
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

    private createRouter() {
        const ret = createRouter();
        ret.usePlugin(browserPlugin());
        ret.subscribe(ev => this.setCurrentState(ev.route));
        return ret;
    }

    private preprocessRoutes(routes) {
        const ret = routes.filter(r => !isOmitted(r));
        ret.forEach(r => {
            if (r.children) r.children = this.preprocessRoutes(r.children);
        });
        return ret;
    }
}
