/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {uniqueId} from 'lodash';

/**
 * Model for handling navigation between Onsen pages
 */
@HoistModel()
export class NavigatorModel {

    _navigator = null;
    _callback = null;

    /**
     * @param {Object} page - page spec
     * @param {function} page.pageFactory - element factory for page component.
     * @param {string} page.props - props to passed to page upon creation
     */
    constructor(page) {
        this.initPage = page;
    }

    /**
     * @param {Object} page - page spec
     * @param {function} page.pageFactory - element factory for page component.
     * @param {string} page.props - props to passed to page upon creation
     * @param {function} callback - function to execute after the page transition
     */
    pushPage(page, callback) {
        this._navigator.pushPage(page);
        this._callback = callback;
    }

    /**
     * @param {function} callback - function to execute after the page transition
     */
    popPage(callback) {
        this._navigator.popPage();
        this._callback = callback;
    }

    //--------------------
    // Implementation
    //--------------------
    renderPage(page, navigator) {
        if (!this._navigator) this._navigator = navigator;

        const {pageFactory, props} = page,
            key = uniqueId('page_');

        return pageFactory({key, ...props});
    }

    doCallback() {
        if (this._callback) this._callback();
        this._callback = null;
    }

}