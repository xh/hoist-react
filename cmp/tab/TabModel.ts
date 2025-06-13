/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {TabSwitcherProps} from '@xh/hoist/cmp/tab/TabSwitcherProps';
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
import {TabContainerModel} from '@xh/hoist/cmp/tab/TabContainerModel';
import {ReactElement, ReactNode} from 'react';

export interface TabConfig {
    /** Unique ID, used by container for locating tabs and generating routes. */
    id: string;

    /**
     *  Parent TabContainerModel. Provided by the container when constructing these models -
     *  no need for application to specify directly.
     */
    containerModel?: TabContainerModel;

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

    /** Item to be rendered by this tab.*/
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

    /** Child tab configs for nested rendering. */
    children?: TabConfig[];

    /** Switcher props to specify how to navigate present child tabs. */
    switcher?: boolean | TabSwitcherProps;
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
    children: TabConfig[];
    switcher: TabSwitcherProps;

    private _renderMode: RenderMode;
    private _refreshMode: RefreshMode;

    containerModel: TabContainerModel;
    @managed refreshContextModel: RefreshContextModel;

    get isTabModel() {
        return true;
    }

    constructor({
        id,
        containerModel,
        title = startCase(id),
        icon = null,
        tooltip = null,
        disabled = false,
        excludeFromSwitcher = false,
        showRemoveAction = false,
        content,
        refreshMode,
        renderMode,
        xhImpl = false,
        children,
        switcher = false
    }: TabConfig) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        throwIf(
            showRemoveAction && XH.isMobileApp,
            'Removable Tabs not supported in Mobile toolkit.'
        );

        this.id = id.toString();
        this.containerModel = containerModel;
        this.title = title;
        this.icon = icon;
        this.tooltip = tooltip;
        this.disabled = !!disabled;
        this.excludeFromSwitcher = excludeFromSwitcher;
        this.showRemoveAction = showRemoveAction;
        this.content = content;
        this.children = children;

        // Create default switcher props
        if (switcher === true) switcher = {orientation: XH.isMobileApp ? 'bottom' : 'top'};
        if (switcher === false) switcher = null;

        this.switcher = switcher as TabSwitcherProps;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
        this.refreshContextModel.xhImpl = true;
    }

    activate() {
        this.containerModel.activateTab(this.id);
    }

    get renderMode(): RenderMode {
        return this._renderMode ?? this.containerModel.renderMode;
    }

    get refreshMode(): RefreshMode {
        return this._refreshMode ?? this.containerModel.refreshMode;
    }

    @computed
    get isActive(): boolean {
        return this.containerModel.activeTabId === this.id;
    }

    @action
    setDisabled(disabled: boolean) {
        if (disabled && this.isActive) {
            const {containerModel} = this,
                tab = containerModel.tabs.find(tab => tab.id !== this.id && !tab.disabled);

            throwIf(!tab, 'Cannot disable last enabled tab.');
            containerModel.activateTab(tab.id);
        }

        this.disabled = disabled;
    }
}
