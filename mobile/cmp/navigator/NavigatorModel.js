/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, elem} from '@xh/hoist/core';
import {bindable, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {uniqBy, keys, find, merge, isEqual} from 'lodash';

import {NavigatorPageModel} from './NavigatorPageModel';

/**
 * Model for handling stack-based navigation between Onsen pages.
 * Provides support for routing based navigation.
 */
@HoistModel
export class NavigatorModel {
    /** @member {boolean} */
    @bindable disableAppRefreshButton;

    /** @member {NavigatorPageModel[]} */
    @observable.ref pages = [];

    /** @member {Object[]} */
    routes = [];

    _navigator = null;
    _callback = null;

    /**
     * {Object[]} routes - configs for NavigatorPageModels, representing all supported top-level
     *      pages within this Navigator/App.
     */
    constructor({routes}) {
        throwIf(routes.length === 0, 'NavigatorModel needs at least one route.');
        throwIf(routes.length !== uniqBy(routes, 'id').length, 'One or more routes in NavigatorModel has a non-unique id.');
        this.routes = routes;

        this.addReaction({
            track: () => XH.routerState,
            run: this.onRouteChange
        });

        this.addReaction({
            track: () => this.pages,
            run: this.onPagesChange
        });
    }

    /**
     * @param {function} callback - function to execute (once) after the next page transition.
     */
    setCallback(callback) {
        this._callback = callback;
    }

    /**
     * @param {NavigatorPageModel[]} pages
     */
    @action
    setPages(pages) {
        this.pages = pages;
    }

    //--------------------
    // Implementation
    //--------------------
    onRouteChange({init}) {
        if (!this._navigator || !XH.routerState) return;

        // Break the current route name into parts, and collect any params for each part.
        // Use meta.params to determine which params are associated with each route part.
        // Save these params to use as props for the page.
        const {meta, name, params} = XH.routerState,
            parts = name.split('.');

        const routeParts = parts.map((id, idx) => {
            const metaKey = parts.slice(0, idx + 1).join('.'),
                props = {};

            // Extract props for this part
            keys(meta.params[metaKey]).forEach(it => {
                props[it] = params[it];
            });

            return {id, props};
        });

        // Loop through the route parts, rebuilding the page stack to match.
        const pages = [];

        for (let i = 0; i < routeParts.length; i++) {
            const part = routeParts[i],
                route = find(this.routes, {id: part.id});

            // Ensure route exists
            throwIf(!route, `Route ${part.id} is not configured in the NavigatorModel`);

            // If, on the initial pass, we encounter a route that prevents direct linking,
            // we drop the rest of the route and redirect to the route so far
            if (init && route.disableDirectLink) {
                const completedRouteParts = routeParts.slice(0, i),
                    newRouteName = completedRouteParts.map(it => it.id).join('.'),
                    newRouteParams = merge({}, ...completedRouteParts.map(it => it.props));

                XH.navigate(newRouteName, newRouteParams, {replace: true});
                return;
            }

            const page = new NavigatorPageModel(merge({}, route, part));
            pages.push(page);
        }

        this.setPages(pages);
    }

    onPagesChange() {
        const {pages} = this,
            keyStack = pages.map(it => it.key),
            prevKeyStack = this._prevKeyStack || [];

        // If we have gone back one page in the same stack, we can safely pop() the page
        if (isEqual(keyStack, prevKeyStack.slice(0, -1))) {
            this._navigator.popPage();
        } else {
            this._navigator.resetPageStack(pages);
        }

        this._prevKeyStack = keyStack;
    }

    renderPage(pageModel, navigator) {
        const {init, key, content, props} = pageModel;

        // Note: We use the special "init" object to obtain a reference to the
        // navigator and to read the initial route.
        if (init) {
            if (!this._navigator) {
                this._navigator = navigator;
                this.onRouteChange({init});
            }
            return null;
        }
        return content.prototype.render ? elem(content, {key, ...props}) : content({key, ...props});
    }

    @action
    onPageChange() {
        const {disableAppRefreshButton} = this.getCurrentPageModel();
        this.disableAppRefreshButton = disableAppRefreshButton;
        this.doCallback();
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