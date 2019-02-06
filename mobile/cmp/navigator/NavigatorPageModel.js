/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {withDefault} from '@xh/hoist/utils/js';
import {uniqueId, snakeCase} from 'lodash';

/**
 * Model for a navigator page
 */
@HoistModel
export class NavigatorPageModel {
    pageFactory = null;
    pageProps = null;
    title = null;
    routeId = null;

    key = null;

    /**
     * @param {function} pageFactory - element factory for page component.
     * @param {Object} [pageProps] - props to be passed to page upon creation
     * @param {string} [title] - title for page. Displayed in AppBar header.
     * @param {string} [routeId] - id for mapped route.
     */
    constructor({
        pageFactory,
        pageProps,
        title,
        routeId
    }) {
        this.pageFactory = pageFactory;
        this.pageProps = pageProps;
        this.title = title;
        this.routeId = routeId;

        const key = withDefault(routeId, title, 'page');
        this.key = uniqueId(`${snakeCase(key)}_`);
    }
}