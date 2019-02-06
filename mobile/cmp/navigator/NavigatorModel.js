/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, elemFactory} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {keys, find} from 'lodash';

import {NavigatorPageModel} from './NavigatorPageModel';

/**
 * Model for handling navigation between Onsen pages
 */
@HoistModel
export class NavigatorModel {
    @observable title;
    @observable.ref routes = [];
    @observable.ref pages = [];

    _navigator = null;
    _callback = null;
    _prevPageCount = -1;

    get usingRoutes() {
        return !!this.routes.length;
    }

    /**
     * // Todo: doc
     * @param {Object} page - configuration for NavigatorPageModel
     */
    constructor({routes}) {
        this.routes = routes;

        console.log(this.usingRoutes);

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
     * Todo: Doc
     * @param {String} route - route to append to current url
     * @param {function} callback - function to execute after the page transition
     */
    appendRoute(route, callback) {
        const {name} = XH.routerState;
        XH.navigate(`${name}.${route}`);
        this._callback = callback;
    }

    /**
     * Todo: Doc
     * @param {function} callback - function to execute after the page transition
     */
    back(callback) {
        const {name} = XH.routerState,
            match = name.match(/.*(?=\.)/);
        if (match) XH.navigate(match[0]);
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

    onRouteChange() {
        const {pages, routes} = this,
            {routerState} = XH;

        if (!this._navigator || !routerState) return;

        const {meta, name, params} = routerState,
            parts = name.split('.'),
            newPages = [];

        // Break the route into parts, and collect any params for each part.
        // Use meta.params to determine which params are associated with each route part.
        const routeParts = parts.map((part, idx) => {
            const metaKey = parts.slice(0, idx + 1).join('.'),
                ret = {};

            keys(meta.params[metaKey]).forEach(it => {
                ret[it] = params[it];
            });

            return {id: part, params: ret};
        });

        // Loop through the route parts.
        // At each part, check to see if the page already exists at the expected position within the stack.
        // If it doesn't, the route has changed. Remove this and any later pages from the stack, and then rebuild from there.
        routeParts.forEach((part, idx) => {
            const route = find(routes, {id: part.id}),
                page = pages[idx];

            throwIf(!route, `Route ${part.id} is not configured in the NavigatorModel`);

            if (!page || page.routeId !== route.id) {
                newPages.push({
                    title: route.title,
                    routeId: route.id,
                    pageFactory: elemFactory(route.content)
                });
            } else {
                newPages.push(pages[idx]);
            }
        });

        this.setPages(newPages);
    }

    renderPage(pageModel, navigator) {
        const {init, key, pageFactory, pageProps} = pageModel;
        if (init) {
            // We use the initial route to obtain a reference to the navigator and to read the initial route
            if (!this._navigator) {
                this._navigator = navigator;
                this.onRouteChange();
            }
            return null;
        } else {
            return pageFactory({key, ...pageProps});
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