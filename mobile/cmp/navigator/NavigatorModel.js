/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, elem} from '@xh/hoist/core';
import {bindable, observable, action} from '@xh/hoist/mobx';
import {ensureNotEmpty, ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {keys, find, merge, isEqual} from 'lodash';

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
        ensureNotEmpty(routes, 'NavigatorModel needs at least one route.');
        ensureUniqueBy(routes, 'id', 'Multiple NavigatorModel routes share a non-unique id.');

        this.routes = routes;

        this.addReaction({
            track: () => XH.routerState,
            run: this.onRouteChange
        });

        this.addReaction({
            track: () => this.pages,
            run: this.onPagesChangeAsync
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

    async onPagesChangeAsync() {
        await this.updateNavigatorPagesAsync();

        // Ensure only the last page is visible after a page transition.
        if (!this._navigator) return;
        const {pages} = this._navigator._navi;
        pages.forEach((pageEl, idx) => {
            const lastPage = idx === pages.length - 1;
            pageEl.style.display = lastPage ? 'block' : 'none';
        });
    }

    async updateNavigatorPagesAsync() {
        if (!this._navigator) return;
        const {pages} = this,
            keyStack = pages.map(it => it.key),
            prevKeyStack = this._prevKeyStack || [],
            backOnePage = isEqual(keyStack, prevKeyStack.slice(0, -1)),
            forwardOnePage = isEqual(keyStack.slice(0, -1), prevKeyStack);

        this._prevKeyStack = keyStack;

        if (backOnePage) {
            // If we have gone back one page in the same stack, we can safely pop() the page
            return this._navigator.popPage();
        } else if (forwardOnePage) {
            // If we have gone forward one page in the same stack, we can safely push() the new page
            return this._navigator.pushPage(pages[pages.length - 1]);
        } else {
            // Otherwise, we should reset the page stack
            return this._navigator.resetPageStack(pages, {animation: 'none'});
        }
    }

    renderPage(pageModel, navigator) {
        const {init, content, props} = pageModel;
        let key = pageModel.key;

        // Note: We use the special "init" object to obtain a reference to the
        // navigator and to read the initial route.
        if (init) {
            if (!this._navigator) {
                this._navigator = navigator;
                this.onRouteChange({init});
            }
            return null;
        }

        // This is a workaround for an Onsen issue with resetPageStack(),
        // which can result in transient duplicate pages in a stack. Having duplicate pages
        // will cause React to throw with a duplicate key error. The error occurs
        // when navigating from one page stack to another where the last page of
        // the new stack is already present in the previous stack.
        //
        // For this workaround, we skip rendering the duplicate page (the one at the incorrect index).
        //
        // See https://github.com/OnsenUI/OnsenUI/issues/2682
        const onsenNavPages = this._navigator.routes.filter(it => !it.init),
            hasDupes = onsenNavPages.filter(it => it.key === key).length > 1;

        if (hasDupes) {
            const onsenIdx = onsenNavPages.indexOf(pageModel),
                ourIdx = this.pages.findIndex(it => it.key === key);

            if (onsenIdx !== ourIdx) return null;
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