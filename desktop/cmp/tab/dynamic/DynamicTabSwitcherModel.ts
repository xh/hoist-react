/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TabContainerModel, TabModel} from '@xh/hoist/cmp/tab';
import {
    IDynamicTabSwitcherModel,
    TabSwitcherConfig,
    TabSwitcherMenuContext
} from '@xh/hoist/cmp/tab/Types';
import {HoistModel, MenuItemLike, MenuToken, ReactionSpec, XH} from '@xh/hoist/core';
import {getContextMenuItem} from '@xh/hoist/desktop/cmp/tab/impl/TabContextMenuItems';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {compact, find} from 'lodash';
import {action, computed, observable, when} from 'mobx';
import React from 'react';

/**
 * State management for the DynamicTabSwitcher component.
 * @internal
 */
export class DynamicTabSwitcherModel extends HoistModel implements IDynamicTabSwitcherModel {
    declare config: TabSwitcherConfig;

    private readonly extraMenuItems: Array<MenuItemLike<MenuToken, TabSwitcherMenuContext>>;
    private readonly tabContainerModel: TabContainerModel;
    @observable.ref private visibleTabState: TabState[];

    @computed
    get favoriteTabIds(): string[] {
        return this.visibleTabState.filter(it => it.isFavorite).map(it => it.tabId);
    }

    @computed
    get visibleTabs(): TabModel[] {
        return compact(this.visibleTabState.map(it => this.tabContainerModel.findTab(it.tabId)));
    }

    @computed
    get enabledVisibleTabs(): TabModel[] {
        return this.visibleTabs.filter(it => !it.disabled);
    }

    constructor(
        {extraMenuItems = [], initialFavorites = []}: TabSwitcherConfig,
        tabContainerModel: TabContainerModel
    ) {
        super();
        makeObservable(this);

        this.extraMenuItems = extraMenuItems;
        this.tabContainerModel = tabContainerModel;
        this.visibleTabState = this.getValidTabIds(initialFavorites).map(tabId => ({
            tabId,
            isFavorite: true
        }));

        // Wait for router to start before observing active tab
        when(
            () => XH.appIsRunning,
            () => this.addReaction(this.activeTabReaction())
        );
    }

    isTabActive(tabId: string): boolean {
        return this.tabContainerModel.activeTabId === tabId;
    }

    isTabFavorite(tabId: string): boolean {
        return !!find(this.visibleTabState, {tabId})?.isFavorite;
    }

    @action
    toggleTabFavorite(tabId: string) {
        this.visibleTabState = !this.isTabVisible(tabId)
            ? [...this.visibleTabState, {tabId, isFavorite: true}]
            : this.visibleTabState.map(it =>
                  it.tabId === tabId ? {tabId, isFavorite: !this.isTabFavorite(tabId)} : it
              );
    }

    activate(tabId: string) {
        this.tabContainerModel.activateTab(tabId);
    }

    @action
    hide(tabId: string) {
        const {enabledVisibleTabs, tabContainerModel} = this;
        if (tabContainerModel.activeTabId === tabId) {
            const visitableTabs = enabledVisibleTabs.filter(tab => tab instanceof TabModel),
                activeTabIdx = visitableTabs.findIndex(tab => tab.id === tabId),
                toActivate =
                    visitableTabs[
                        activeTabIdx + (activeTabIdx === visitableTabs.length - 1 ? -1 : 1)
                    ];
            if (toActivate) tabContainerModel.activateTab(toActivate);
        }
        this.visibleTabState = this.visibleTabState.filter(it => it.tabId !== tabId);
    }

    getContextMenuItems(
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        tab: TabModel
    ): Array<MenuItemLike<MenuToken, TabSwitcherMenuContext>> {
        const isFavorite = this.isTabFavorite(tab.id);
        return [
            {
                icon: Icon.favorite({prefix: isFavorite ? 'fal' : 'fas'}),
                text: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
                actionFn: () => this.toggleTabFavorite(tab.id)
            },
            ...this.extraMenuItems.map(item => getContextMenuItem(item, {contextMenuEvent: e, tab}))
        ];
    }

    @action
    setFavoriteTabIds(tabIds: string[]) {
        const visibleTabState = this.getValidTabIds(tabIds).map(tabId => ({
                tabId,
                isFavorite: true
            })),
            {activeTab} = this.tabContainerModel;
        if (activeTab && !activeTab.excludeFromSwitcher && !tabIds.includes(activeTab.id)) {
            visibleTabState.push({tabId: activeTab.id, isFavorite: false});
        }
        this.visibleTabState = visibleTabState;
    }

    @action
    onDragEnd(result) {
        if (!result.destination) return;
        const visibleTabState = [...this.visibleTabState],
            [removed] = visibleTabState.splice(result.source.index, 1);
        visibleTabState.splice(result.destination.index, 0, removed);
        this.visibleTabState = visibleTabState;
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    private activeTabReaction(): ReactionSpec<TabModel> {
        return {
            track: () => this.tabContainerModel.activeTab,
            run: ({id: tabId, excludeFromSwitcher}) => {
                if (!excludeFromSwitcher && !this.isTabVisible(tabId)) {
                    this.visibleTabState = [...this.visibleTabState, {tabId, isFavorite: false}];
                }
            },
            fireImmediately: true
        };
    }

    private getValidTabIds(tabIds: string[]): string[] {
        return tabIds.filter(id => this.isValidTabId(id));
    }

    private isValidTabId(tabId: string): boolean {
        const tabModel = this.tabContainerModel.findTab(tabId);
        return !!(tabModel && !tabModel.excludeFromSwitcher);
    }

    private isTabVisible(tabId: string): boolean {
        return this.visibleTabState.some(it => it.tabId === tabId);
    }
}

interface TabState {
    tabId: string;
    isFavorite: boolean;
}
