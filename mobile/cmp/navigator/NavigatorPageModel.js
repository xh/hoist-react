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
 * Model for a NavigatorPage within a Navigator. Specifies the actual content (i.e. page)
 * to be rendered for a given route.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `NavigatorModel.routes` constructor config.
 */
@HoistModel
export class NavigatorPageModel {

    route = null;
    content = null;
    props = null;
    title = null;
    preventLink = null;

    key = null;

    /**
     * @param {string} route - mapped route, which must correspond to a configured Router5 route name.
     * @param {Object} content - content to be rendered by this route. Component class or a custom
     *      element factory of the form returned by elemFactory.
     * @param {Object} [props] - props to be passed to page upon creation.
     * @param {string} [title] - title for page. Displayed in AppBar header.
     * @param {boolean} [preventLink] - Don't allow the route can be arrived at in a new browser session.
     *      Non-linkable routes are unwound to a safe starting point at the start of a new session.
     */
    constructor({
        route,
        content,
        props,
        title,
        preventLink
    }) {
        this.route = route;
        this.content = content;
        this.props = props;
        this.title = title;
        this.preventLink = preventLink;

        const key = withDefault(route, title, 'page');
        this.key = uniqueId(`${snakeCase(key)}_`);
    }
}