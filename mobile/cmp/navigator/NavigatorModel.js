/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, elem} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {uniqBy, keys, find, merge} from 'lodash';

import {NavigatorPageModel} from './NavigatorPageModel';

/**
 * Model for handling stack-based navigation between Onsen pages.
 * Provides support for routing based navigation.
 */
@HoistModel
export class NavigatorModel {
    @observable title;
    @observable.ref routes = [];
    @observable.ref pages = [];

    _navigator = null;
    _callback = null;
    _prevPageCount = -1;

    /**
     * {Object[]} routes - configs for NavigatorPageModels.
     */
    constructor({routes}) {
        throwIf(routes.length === 0, 'NavigatorModel needs at least one route.');
        throwIf(routes.length !== uniqBy(routes, 'route').length, 'One or more routes in NavigatorModel has a non-unique route id.');
        this.routes = routes;

        this.addReaction({
            track: () => [this.pages, this._navigator],
            run: () => this.onPagesChange()
        });

        this.addReaction({
            track: () => [XH.routerState, this.routes],
            run: () => this.onRouteChange()
        });
    }

    /**
     * Add a route to the current route
     *
     * @param {String} route - route to append to current url
     * @param {Object} [params] - route parameters to use with route
     * @param {function} [callback] - function to execute after the page transition
     */
    appendRoute(route, params, callback) {
        const {name} = XH.routerState;
        this.navigate(`${name}.${route}`, params, callback);
    }

    /**
     * Go back one nested route level (i.e. pop a page from the stack).
     *
     * @param {function} [callback] - function to execute after the page transition
     */
    back(callback) {
        const {name} = XH.routerState,
            match = name.match(/.*(?=\.)/);
        if (match) this.navigate(match[0], null, callback);
    }

    /**
     * Change the current route
     *
     * @param {String} route - route to append to current url
     * @param {Object} [params] - route parameters to use with route
     * @param {function} [callback] - function to execute after the page transition
     */
    navigate(route, params, callback) {
        XH.navigate(route, params);
        this._callback = callback;
    }

    @action
    setRoutes(routes) {
        this.routes = routes;
    }

    @action
    setPages(pages) {
        this.pages = pages.map(page => {
            return page instanceof NavigatorPageModel ? page : new NavigatorPageModel(page);
        });
    }

    //--------------------
    // Implementation
    //--------------------
    onPagesChange() {
        if (!this._navigator) return;
        const {pages} = this;

        if (pages.length === this._prevPageCount - 1) {
            this._navigator.popPage();
        } else {
            this._navigator.resetPageStack(pages);
        }

        this._prevPageCount = pages.length;
    }

    onRouteChange(init) {
        const {pages, routes} = this,
            {routerState} = XH;

        if (!this._navigator || !routerState) return;

        // Break the route into parts, and collect any params for each part.
        // Use meta.params to determine which params are associated with each route part.
        // Save these params to use as props for the page.
        const {meta, name, params} = routerState,
            parts = name.split('.');

        const routeParts = parts.map((part, idx) => {
            const metaKey = parts.slice(0, idx + 1).join('.'),
                ret = {};

            keys(meta.params[metaKey]).forEach(it => {
                ret[it] = params[it];
            });

            return {route: part, props: ret};
        });

        // Loop through the route parts, rebuilding the page stack to match.
        // At each part, check to see if the page already exists at the expected position within the stack.
        const newPages = [];

        for (let i = 0; i < routeParts.length; i++) {
            const part = routeParts[i],
                page = pages[i],
                route = find(routes, {route: part.route});

            throwIf(!route, `Route ${part.route} is not configured in the NavigatorModel`);

            // If, on the initial pass, we encounter a route that prevents linking,
            // we drop the rest of the route and redirect to the route so far
            if (init && route.preventLink) {
                const completedRouteParts = routeParts.slice(0, i),
                    newRouteName = completedRouteParts.map(it => it.route).join('.'),
                    newRouteParams = merge({}, ...completedRouteParts.map(it => it.props));

                XH.navigate(newRouteName, newRouteParams, {replace: true});
                return;
            }

            if (!page || page.route !== route.route) {
                // Add new page
                newPages.push(merge({}, route, part));
            } else {
                // Keep same page
                newPages.push(page);
            }
        }

        this.setPages(newPages);
    }

    renderPage(pageModel, navigator) {
        const {init, key, content, props} = pageModel;
        if (init) {
            // Note: We use the special "init" route to obtain a reference to the
            // navigator and to read the initial route.
            if (!this._navigator) {
                this._navigator = navigator;
                this.onRouteChange(init);
            }
            return null;
        } else {
            return content.prototype.render ? elem(content, {key, ...props}) : content({key, ...props});
        }
    }

    onPageChange() {
        this.updateTitle();
        this.doCallback();
    }

    @action
    updateTitle() {
        const {title} = this.getCurrentPageModel();
        if (title) this.title = title;
    }

    getCurrentPageModel() {
        const {pages} = this;
        return pages[pages.length - 1];
    }

    doCallback() {
        if (this._callback) this._callback();
        this._callback = null;
    }

}