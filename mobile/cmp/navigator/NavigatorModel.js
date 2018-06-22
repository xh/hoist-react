/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {clone} from 'lodash';

import {NavigatorPageModel} from './NavigatorPageModel';

/**
 * Model for handling navigation between Onsen pages
 */
@HoistModel()
export class NavigatorModel {
    initPageModel = null;
    @observable title;
    @observable.ref pages = [];

    _navigator = null;
    _callback = null;

    /**
     * @param {Object} page - configuration for NavigatorPageModel
     */
    constructor(page) {
        this.initPageModel = new NavigatorPageModel(page);
        this.onPageChange();
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

}