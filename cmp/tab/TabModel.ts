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
import {isArray, isUndefined, startCase} from 'lodash';
import {TabContainerConfig, TabContainerModel, tabContainer} from '@xh/hoist/cmp/tab';
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
     * Item to be rendered by this tab, or specification for a child tab container for this tab.
     */
    content?: Content | TabConfig[] | TabContainerConfig;

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

    containerModel: TabContainerModel;
    @managed refreshContextModel: RefreshContextModel;

    /** Child TabContainerModel. For nested TabContainers only. */
    @managed childContainerModel: TabContainerModel;

    private _renderMode: RenderMode;
    private _refreshMode: RefreshMode;

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
            content,
            refreshMode,
            renderMode,
            xhImpl = false
        }: TabConfig,
        containerModel: TabContainerModel
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
        this.containerModel = containerModel;
        this._renderMode = renderMode;
        this._refreshMode = refreshMode;
        this.refreshContextModel = new ManagedRefreshContextModel(this);
        this.refreshContextModel.xhImpl = true;
        this.content = this.parseContent(content);
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

    //------------------
    // Implementation
    //------------------
    private parseContent(content: Content | TabContainerConfig | TabConfig[]): Content {
        // Recognize if content is a child container spec.
        let childConfig: TabContainerConfig = null;
        if (isArray(content)) {
            childConfig = {tabs: content};
        } else if ('tabs' in content) {
            childConfig = content;
        } else {
            // ...otherwise just pass through
            return content;
        }

        // It's a child container, create model and return
        throwIf(XH.isMobileApp, 'Child Tabs not supported for Mobile TabContainer');
        const {id} = this,
            parent = this.containerModel;

        childConfig = {
            renderMode: parent.renderMode,
            refreshMode: parent.refreshMode,
            emptyText: parent.emptyText,
            switcher: parent.switcher,
            track: parent.track,
            ...childConfig
        };

        // Trampoline nested routing OR persistence (TCM supports one or the other)
        if (parent.route && !childConfig.route) {
            childConfig.route = `${parent.route}.${id}`;
        } else if (parent.persistWith && isUndefined(childConfig.persistWith)) {
            childConfig.persistWith = {
                ...parent.persistWith,
                path: `${parent.persistWith.path}.${id}`
            };
        }

        this.childContainerModel = new TabContainerModel(childConfig);
        return tabContainer({model: this.childContainerModel});
    }
}
