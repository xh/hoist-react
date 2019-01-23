/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {clone, keys} from 'lodash';

import {NavigatorPageModel} from './NavigatorPageModel';

/**
 * Model for handling navigation between Onsen pages
 */
@HoistModel
export class NavigatorModel {
    initPageModel = null;
    @observable title;
    @observable.ref pages = [];

    _navigator = null;
    _callback = null;

    /**
     * @param {Object} page - configuration for NavigatorPageModel
     */
    constructor({routes, ...page}) {
        console.log(routes, page);
        this.initPageModel = new NavigatorPageModel(page);
        this.onPageChange();

        this.addReaction(this.routerReaction());
    }

    /**
     * @param {Object} page - configuration for NavigatorPageModel
     * @param {function} [callback] - function to execute after the page transition
     */
    pushPage(page, callback) {
        this._navigator.pushPage(new NavigatorPageModel(page));
        this._callback = callback;
    }

    /**
     * @param {function} callback - function to execute after the page transition
     */
    popPage(callback) {
        this._navigator.popPage();
        this._callback = callback;
    }

    onPageChange() {
        this.updatePages();
        this.updateTitle();
        this.doCallback();
    }

    //--------------------
    // Implementation
    //--------------------
    renderPage(pageModel, navigator) {
        if (!this._navigator) this._navigator = navigator;
        const {key, pageFactory, pageProps} = pageModel;
        return pageFactory({key, ...pageProps});
    }

    @action
    updatePages() {
        this.pages = this._navigator ? clone(this._navigator.pages) : [];
    }

    @action
    updateTitle() {
        const page = this.getCurrentPageModel();
        this.title = page.title;
    }

    getCurrentPageModel() {
        const nav = this._navigator;
        return nav ? nav.routes[nav.routes.length - 1] : this.initPageModel;
    }

    doCallback() {
        if (this._callback) this._callback();
        this._callback = null;
    }

    routerReaction() {
        return {
            track: () => XH.routerState,
            run: (state) => {
                if (!state) return;
                const {meta, name, params, path} = state,
                    parts = name.split('.');

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

                console.log(routeParts, meta, name, params, path);
            }
        };
    }

}