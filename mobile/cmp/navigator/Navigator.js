/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';

/**
 * Mask with spinner. The mask can be explicitly shown or reactively bound to a PromiseModel.
 */
@HoistComponent()
export class Navigator extends Component {

    _depth = -1;
    _navigator = null;

    render() {
        // Todo: Use Onsen's stateless RouterNavigator?
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
            this._navigator = navigator;
            this.addAutorun(() => this.syncFromRouter());
            return null;
        } else {
            // Add the page to the stack accordingly
            const currentRouteName = state.name.split('.').pop(),
                route = this.findRouteCfgRecursive(XH.appModel.getRoutes(), currentRouteName),
                {name, pageFactory} = route ? route : {};

            if (pageFactory) {
                return pageFactory({key: name, routeParams: state.params});
            } else {
                return null;
            }
        }
    }

    syncFromRouter() {
        // Todo: Why is this triggering twice??
        if (!this._navigator) return;

        const state = XH.routerModel.currentState,
            path = state.path,
            pathLength = path.split('/').filter(Boolean).length;

        // Push or pop the page to the stack according to depth
        if (this._depth < pathLength) {
            this._navigator.pushPage(state);
        } else if (this._depth > pathLength) {
            this._navigator.popPage();
        }
        this._depth = pathLength;
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

export const navigator = elemFactory(Navigator);