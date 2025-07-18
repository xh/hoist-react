/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    XH,
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    RefreshMode,
    RenderMode,
    Content,
    RefreshContextModel,
    Thunkable
} from '@xh/hoist/core';
import {action, computed, observable, makeObservable, bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';
import {TabContainerConfig, TabContainerModel} from '@xh/hoist/cmp/tab/TabContainerModel';
import {ReactElement, ReactNode} from 'react';

export interface TabConfig {
    /** Unique ID, used by container for locating tabs and generating routes. */
    id: string;

    /** Display title for the Tab in the container's TabSwitcher. */
    title?: ReactNode;

    /** Display icon for the Tab in the container's TabSwitcher. */
    icon?: ReactElement;

    /** Tooltip for the Tab in the container's TabSwitcher. */
    tooltip?: ReactNode;

    /** True to disable this tab in the TabSwitcher and block routing. */
    disabled?: boolean;

    /**
     * True to hide this Tab in the TabSwitcher, but still be able to activate the tab manually
     * or via routing.
     */
    excludeFromSwitcher?: boolean;

    /** Display an affordance to allow the user to remove this tab from its container.*/
    showRemoveAction?: boolean;

    /**
     * Child TabContainerConfig. When this is defined, will construct a TabContainerModel
     * that will be used by a TabContainer rendered instead of the defined content.
     * */
    subTabContainer?: TabContainerConfig;

    /** Css class to be added when rendering the tab container. */
    subTabContainerClass?: string;

    /** Item to be rendered by this tab if subTabContainer property is not also defined.*/
    content?: Content;

    /**
     * Strategy for rendering this tab. If null, will default to its container's mode. See enum
     * for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing this tab. If null, will default to its container's mode. See enum
     * for description of supported modes.
     */
    refreshMode?: RefreshMode;

    /** True to skip this tab.  */
    omit?: Thunkable<boolean>;

    /** @internal */
    xhImpl?: boolean;
}

/**
 * Model for a Tab within a TabContainer. Specifies the actual content (child component) to be
 * rendered within a tab and manages that content's active and refresh state.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `TabContainerModel.tabs` constructor config.
 */
export class TabModel extends HoistModel {
    id: string;
    @bindable.ref title: ReactNode;
    @bindable.ref icon: ReactElement;
    @bindable.ref tooltip: ReactNode;
    @observable disabled: boolean;
    @bindable excludeFromSwitcher: boolean;
    showRemoveAction: boolean;
    content: Content;
    subTabContainer: TabContainerModel;
    subTabContainerClass: string;

    private _renderMode: RenderMode;
    private _refreshMode: RefreshMode;

    readonly parentContainerModel: TabContainerModel;

    @managed refreshContextModel: RefreshContextModel;

    get isTabModel() {
        return true;
    }

    constructor(
        {
            id,
            title = startCase(id),
            icon = null,
            tooltip = null,
            disabled = false,
            excludeFromSwitcher = false,
            showRemoveAction = false,
            subTabContainer,
            subTabContainerClass,
            content,
            refreshMode,
            renderMode,
            xhImpl = false
        }: TabConfig,
        parentContainerModel?: TabContainerModel
    ) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        throwIf(
            showRemoveAction && XH.isMobileApp,
            'Removable Tabs not supported in Mobile toolkit.'
        );

        this.id = id.toString();
        this.title = title;
        this.icon = icon;
        this.tooltip = tooltip;
        this.disabled = !!disabled;
        this.excludeFromSwitcher = excludeFromSwitcher;
        this.showRemoveAction = showRemoveAction;
        this.content = content;
        this.parentContainerModel = parentContainerModel;

        this.subTabContainer = this.createSubTabContainerModel(subTabContainer);
        this.subTabContainerClass = subTabContainerClass;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
        this.refreshContextModel.xhImpl = true;
    }

    activate() {
        this.parentContainerModel.activateTab(this.id);
    }

    get renderMode(): RenderMode {
        return this._renderMode ?? this.parentContainerModel?.renderMode;
    }

    get refreshMode(): RefreshMode {
        return this._refreshMode ?? this.parentContainerModel?.refreshMode;
    }

    @computed
    get isActive(): boolean {
        return this.parentContainerModel?.activeTabId === this.id;
    }

    @action
    setDisabled(disabled: boolean) {
        if (disabled && this.isActive) {
            const {parentContainerModel} = this,
                tab = parentContainerModel.tabs.find(tab => tab.id !== this.id && !tab.disabled);

            throwIf(!tab, 'Cannot disable last enabled tab.');
            parentContainerModel.activateTab(tab.id);
        }

        this.disabled = disabled;
    }

    //-------------------------
    // Implementation
    //-------------------------
    /**
     * Creates a TabContainerModel for a nested (sub) tab configuration.
     *
     * This function is designed for use in tab structures where the route can be
     * derived from the current navigation context, rather than being explicitly provided.
     *
     * If the config does not specify a `route`, the function will automatically generate one
     * by appending this tab's `id` to the parent container's route, forming a fully qualified
     * path (e.g., `parent.route.tabId`).
     *
     * This helps simplify sub-tab configuration and keeps routing declarative and consistent
     * across the navigation tree.
     *
     * @param config - The configuration object for the sub-tab container.
     * @returns A fully constructed TabContainerModel instance.
     */
    createSubTabContainerModel(config: TabContainerConfig) {
        if (config) {
            return new TabContainerModel({
                ...config,
                route: config.route ?? `${this.parentContainerModel?.route}.${this.id}`
            });
        }
    }
}
