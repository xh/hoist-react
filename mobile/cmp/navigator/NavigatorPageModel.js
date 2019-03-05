/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {withDefault} from '@xh/hoist/utils/js';
import {stringify} from 'qs';

/**
 * Model for a NavigatorPage within a Navigator. Specifies the actual content (i.e. page)
 * to be rendered for a given route.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `NavigatorModel.routes` constructor config.
 */
@HoistModel
export class NavigatorPageModel {

    id;
    content;
    props;
    disableDirectLink;
    disableAppRefreshButton;

    /**
     * A generated key which combines the id and sorted props to identify the page in the stack.
     * The returned string is stable for a given id and props.
     */
    get key() {
        const {id, props} = this,
            qsOpts = {allowDots: true, sort: (a, b) => a.localeCompare(b)};
        return stringify({id, props}, qsOpts);
    }

    /**
     * @param {string} id - unique ID. Must match a configured Router5 route name.
     * @param {Object} content - content to be rendered. Component class or a custom
     *      element factory of the form returned by elemFactory.
     * @param {Object} [props] - props to be passed to page upon creation.
     * @param {boolean} [disableDirectLink] - Don't allow the route can be arrived at in a new browser session.
     *      Non-linkable routes are unwound to a safe starting point at the start of a new session.
     * @param {boolean} [disableAppRefreshButton] - Hide any visible app refresh button when at this page.
     */
    constructor({
        id,
        content,
        props,
        disableDirectLink,
        disableAppRefreshButton
    }) {
        this.id = id;
        this.content = content;
        this.props = withDefault(props, {});
        this.disableDirectLink = withDefault(disableDirectLink, false);
        this.disableAppRefreshButton = withDefault(disableAppRefreshButton, false);
    }
}