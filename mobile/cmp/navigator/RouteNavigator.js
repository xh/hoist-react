/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/*

Todo: Still working on getting the navigator to co-operate with routing.
This is not functional, but has some ideas that we can revisit later


import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/mobile/onsen';
import {keys} from 'lodash';

@HoistComponent()
export class RouteNavigator extends Component {

    _depth = -1;
    _navigator = null;

    render() {
        return onsenNavigator({
            renderPage: (state, navigator) => this.renderPage(state, navigator),
            initialRoute: {init: true}
        });
    }

    //------------------
    // Implementation
    //------------------
    renderPage(state, navigator) {
        if (state.init) {
            // We use the init route to get a reference to the navigator and bind the autorun to the router
            if (!this._navigator) {
                this._navigator = navigator;
                this.addAutorun(() => this.syncFromRouter());
            }
            return null;
        } else {
            // Add the page to the stack accordingly
            console.log(state);

            const currentRouteName = state.name.split('.').pop(),
                route = this.findRouteCfgRecursive(XH.app.getRoutes(), currentRouteName),
                {name, pageFactory} = route ? route : {};

            if (pageFactory) {
                return pageFactory({key: name, routeParams: state.params});
            } else {
                return null;
            }
        }
    }

    syncFromRouter() {
        const state = XH.routerModel.currentState,
            metaKeys = keys(state.meta.params),
            parts = state.meta.params,
            pages = this._navigator.pages,
            depth = state.name.split('.').length;

        console.log(state, pages);

        // Get current route data
        const routeParts = state.name.split('.').map(key => {
            // Collect relevant params for this route part from current state.
            // We use the routes state.meta.params to determine which params are used for each route part.
            const metaKey = metaKeys.find(it => it.endsWith(key)),
                params = {};

            keys(state.meta.params[metaKey]).forEach(it => {
                params[it] = state.params[it];
            });

            return {key, params};
        });

        // Loop through route parts, updating the navigator page stack to match
        routeParts.forEach((part, idx) => {

            if (!pages[idx] || pages[idx].key !== part.key) {
                // If the route part extends beyond current stack, push it
                this._navigator.pushPage(part);
            }
            console.log(part, idx, pages[idx]);
        });

        // Push or pop the page to the stack according to depth
        if (this._depth < depth) {
            this._navigator.pushPage(state);
        } else if (this._depth > depth) {
            this._navigator.popPage();
        }

        this._depth = depth;
    }

    findRouteCfgRecursive(routes, name) {
        let match = null;

        routes.forEach(route => {
            if (match) return;
            if (route.name === name) {
                match = route;
            } else if (route.children) {
                match = this.findRouteCfgRecursive(route.children, name);
            }
        });

        return match;
    }

}

export const routeNavigator = elemFactory(RouteNavigator);
*/