/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    Content,
    HoistModel,
    HoistProps,
    managed,
    ManagedRefreshContextModel,
    RefreshMode,
    RenderMode
} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {warnIf, withDefault} from '@xh/hoist/utils/js';
import {stringify} from 'qs';
import {NavigatorModel} from './NavigatorModel';

export interface PageConfig {
    /** Unique ID. Must match a configured Router5 route name. */
    id: string;

    /** Content to be rendered on this page. */
    content: Content;

    /** Props to be passed to page upon creation. */
    props?: HoistProps;

    /**
     * Strategy for rendering this Page. If null, will default to its Navigator's mode.
     * See enum for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing this Page. If null, will default to its Navigator's mode. See
     * enum for description of supported modes.
     */
    refreshMode?: RefreshMode;

    /**
     * Don't allow the Page route to be arrived at in a new browser session.  Non-linkable
     * routes are unwound to a safe starting point at the start of a new session.
     */
    disableDirectLink?: boolean;

    /** Hide any visible app refresh button when at this Page. */
    disableAppRefreshButton?: boolean;

    /**
     * Parent NavigatorModel. Provided by the navigator when constructing these models -
     * no need to specify manually.
     */
    navigatorModel?: NavigatorModel;
}

/**
 * Model for a Page within a Navigator. Specifies the actual content (i.e. page)
 * to be rendered for a given route.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `NavigatorModel.pages` constructor config.
 */
export class PageModel extends HoistModel {
    id: string;
    content: Content;
    props: HoistProps;
    disableDirectLink: boolean;
    disableAppRefreshButton: boolean;

    navigatorModel;
    @managed refreshContextModel;
    @managed errorBoundaryModel;

    private _renderMode: RenderMode;
    private _refreshMode: RefreshMode;

    /**
     * A generated key which combines the id and sorted props to identify the page in the stack.
     * The returned string is stable for a given id and props.
     */
    get key(): string {
        const {id, props} = this,
            qsOpts = {allowDots: true, sort: (a, b) => a.localeCompare(b)};
        return stringify({id, props}, qsOpts);
    }

    get renderMode(): RenderMode {
        return this._renderMode ?? this.navigatorModel.renderMode;
    }

    get refreshMode(): RefreshMode {
        return this._refreshMode ?? this.navigatorModel.refreshMode;
    }

    @computed
    get isActive(): boolean {
        return this.id === this.navigatorModel.activePageId;
    }

    constructor({
        id,
        navigatorModel,
        content,
        props,
        renderMode,
        refreshMode,
        disableDirectLink,
        disableAppRefreshButton
    }: PageConfig) {
        super();
        makeObservable(this);
        warnIf(
            renderMode === 'always',
            "RenderMode.ALWAYS is not supported in PageModel. Pages can't exist before being mounted."
        );

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
