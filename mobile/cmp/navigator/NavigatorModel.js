/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, RefreshMode, RenderMode, XH} from '@xh/hoist/core';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {ensureNotEmpty, ensureUniqueBy, throwIf, warnIf} from '@xh/hoist/utils/js';
import {find, isEqual, keys, merge} from 'lodash';
import {page} from './impl/Page';
import {PageModel} from './PageModel';

/**
 * Model for handling stack-based navigation between Onsen pages.
 * Provides support for routing based navigation.
 */
export class NavigatorModel extends HoistModel {
    /** @member {boolean} */
    @bindable disableAppRefreshButton;

    /** @member {PageModel[]} */
    @observable.ref stack = [];

    /** @member {Object[]} */
    pages = [];

    /** @member {boolean} */
    track;

    /** @member {boolean} */
    swipeToGoBack;

    /** @member {boolean} */
    pullDownToRefresh;

    /** @member {RenderMode} */
    renderMode;

    /** @member {RefreshMode} */
    refreshMode;

    _navigator = null;
    _callback = null;

    /** @type String */
    get activePageId() {
        return this.activePage?.id;
    }

    /** @type PageModel */
    get activePage() {
        const {stack} = this;
        return stack[stack.length - 1];
    }

    /**
     * @param {Object[]} pages - configs for PageModels, representing all supported
     *      pages within this Navigator/App.
     * @param {boolean} [track] - True to enable activity tracking of page views (default false).
     *      Viewing of each page will be tracked with the `oncePerSession` flag, to avoid duplication.
     * @param {boolean} [swipeToGoBack] - True to enable 'swipe to go back' functionality.
     * @param {boolean} [pullDownToRefresh] - True to enable 'pull down to refresh' functionality.
     * @param {RenderMode} [renderMode] - strategy for rendering pages. Can be set per-page
     *      via `PageModel.renderMode`. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing pages. Can be set per-page
     *      via `PageModel.refreshMode`. See enum for description of supported modes.
     */
    constructor({
        pages,
        track = false,
        swipeToGoBack = true,
        pullDownToRefresh = true,
        renderMode = RenderMode.LAZY,
        refreshMode = RefreshMode.ON_SHOW_LAZY
    }) {
        super();
        makeObservable(this);
        warnIf(renderMode === RenderMode.ALWAYS, 'RenderMode.ALWAYS is not supported in Navigator. Pages are always can\'t exist before being mounted.');

        ensureNotEmpty(pages, 'NavigatorModel needs at least one page.');
        ensureUniqueBy(pages, 'id', 'Multiple NavigatorModel PageModels have the same id.');

        this.pages = pages;
        this.track = track;
        this.swipeToGoBack = swipeToGoBack;
        this.pullDownToRefresh = pullDownToRefresh;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;

        this.addReaction({
            track: () => XH.routerState,
            run: this.onRouteChange
        });

        this.addReaction({
            track: () => this.stack,
            run: this.onStackChangeAsync
        });

        if (track) {
            this.addReaction({
                track: () => this.activePageId,
                run: (activePageId) => {
                    XH.track({
                        category: 'Navigation',
                        message: `Viewed ${activePageId} page`,
                        oncePerSession: true
                    });
                }
            });
        }
    }

    /**
     * @param {function} callback - function to execute (once) after the next page transition.
     */
    setCallback(callback) {
        this._callback = callback;
    }

    /**
     * @param {PageModel[]} stack
     */
    @action
    setStack(stack) {
        this.stack = stack;
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
        const stack = [];

        for (let i = 0; i < routeParts.length; i++) {
            const part = routeParts[i],
                pageModelCfg = find(this.pages, {id: part.id});

            // Ensure PageModel that matches route exists
            throwIf(!pageModelCfg, `Route ${part.id} does not match any PageModel.id configured in the NavigatorModel`);

            // If, on the initial pass, we encounter a route that prevents direct linking,
            // we drop the rest of the route and redirect to the route so far
            if (init && pageModelCfg.disableDirectLink) {
                const completedRouteParts = routeParts.slice(0, i),
                    newRouteName = completedRouteParts.map(it => it.id).join('.'),
                    newRouteParams = merge({}, ...completedRouteParts.map(it => it.props));

                XH.navigate(newRouteName, newRouteParams, {replace: true});
                return;
            }

            const page = new PageModel({
                navigatorModel: this,
                ...merge({}, pageModelCfg, part)
            });

            stack.push(page);
        }

        this.setStack(stack);
    }

    async onStackChangeAsync() {
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
        // Sync Onsen Navigator's pages with our stack
        if (!this._navigator) return;
        const {stack} = this,
            keyStack = stack.map(it => it.key),
            prevKeyStack = this._prevKeyStack || [],
            backOnePage = isEqual(keyStack, prevKeyStack.slice(0, -1)),
            forwardOnePage = isEqual(keyStack.slice(0, -1), prevKeyStack);

        // Skip transition animation if the active page is going to be unmounted
        let options;
        if (this.activePage?.renderMode === RenderMode.UNMOUNT_ON_HIDE) {
            options = {animation: 'none'};
        }

        this._prevKeyStack = keyStack;

        if (backOnePage) {
            // If we have gone back one page in the same stack, we can safely pop() the page
            return this._navigator.popPage(options);
        } else if (forwardOnePage) {
            // If we have gone forward one page in the same stack, we can safely push() the new page
            return this._navigator.pushPage(stack[stack.length - 1], options);
        } else {
            // Otherwise, we should reset the page stack
            return this._navigator.resetPageStack(stack, {animation: 'none'});
        }
    }

    renderPage = (model, navigator) => {
        const {init, key} = model;

        // Note: We use the special 'init' object to obtain a reference to the
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
            const onsenIdx = onsenNavPages.indexOf(model),
                ourIdx = this.stack.findIndex(it => it.key === key);

            if (onsenIdx !== ourIdx) return null;
        }

        return page({model, key});
    }

    @action
    onPageChange = () => {
        this.disableAppRefreshButton = this.activePage?.disableAppRefreshButton;
        this.doCallback();
    }

    doCallback() {
        if (this._callback) this._callback();
        this._callback = null;
    }
}
