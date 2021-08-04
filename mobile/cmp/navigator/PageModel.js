/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, ManagedRefreshContextModel, RenderMode} from '@xh/hoist/core';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {warnIf, withDefault} from '@xh/hoist/utils/js';
import {stringify} from 'qs';

/**
 * Model for a Page within a Navigator. Specifies the actual content (i.e. page)
 * to be rendered for a given route.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `NavigatorModel.pages` constructor config.
 */
export class PageModel extends HoistModel {

    id;
    content;
    props;
    disableDirectLink;
    disableAppRefreshButton;

    navigatorModel;
    @managed refreshContextModel;

    /**
     * A generated key which combines the id and sorted props to identify the page in the stack.
     * The returned string is stable for a given id and props.
     */
    get key() {
        const {id, props} = this,
            qsOpts = {allowDots: true, sort: (a, b) => a.localeCompare(b)};
        return stringify({id, props}, qsOpts);
    }

    get renderMode() {
        return this._renderMode ?? this.navigatorModel.renderMode;
    }

    get refreshMode() {
        return this._refreshMode ?? this.navigatorModel.refreshMode;
    }

    @computed
    get isActive() {
        return this.id === this.navigatorModel.activePageId;
    }

    /**
     * @param {string} id - unique ID. Must match a configured Router5 route name.
     * @param {NavigatorModel} navigatorModel - parent NavigatorModel. Provided by the
     *      navigator when constructing these models - no need to specify manually.
     * @param {(ReactElement|Object|function)} content - Hoist Component (class or functional) to be
     *      rendered by this page; or function returning react element to be rendered by this page.
     * @param {Object} [props] - props to be passed to page upon creation.
     * @param {RenderMode} [renderMode] - strategy for rendering this Page. If null, will
     *      default to its Navigator's mode. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing this Page. If null, will
     *      default to its Navigator's mode. See enum for description of supported modes.
     * @param {boolean} [disableDirectLink] - Don't allow the Page route to be arrived at in a new browser session.
     *      Non-linkable routes are unwound to a safe starting point at the start of a new session.
     * @param {boolean} [disableAppRefreshButton] - Hide any visible app refresh button when at this Page.
     */
    constructor({
        id,
        navigatorModel,
        content,
        props,
        renderMode,
        refreshMode,
        disableDirectLink,
        disableAppRefreshButton
    }) {
        super();
        makeObservable(this);
        warnIf(renderMode === RenderMode.ALWAYS, 'RenderMode.ALWAYS is not supported in PageModel. Pages are always can\'t exist before being mounted.');

        this.id = id;
        this.navigatorModel = navigatorModel;
        this.content = content;
        this.props = withDefault(props, {});
        this.disableDirectLink = withDefault(disableDirectLink, false);
        this.disableAppRefreshButton = withDefault(disableAppRefreshButton, false);

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
    }
}
