import {TabContainerModel, TabModel} from '@xh/hoist/cmp/tab';
import {
    ActionTab,
    ActionTabSpec,
    DynamicTabSwitcherConfig,
    DynamicTabSwitcherMenuContext,
    DynamicTabSwitcherModel
} from '@xh/hoist/cmp/tab/Types';
import {
    HoistModel,
    isMenuItem,
    MenuItemLike,
    MenuToken,
    PersistableState,
    ReactionSpec,
    XH
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {compact, find, keyBy, omit as lodashOmit, uniqBy} from 'lodash';
import {action, computed, observable, when} from 'mobx';
import React from 'react';

/**
 * State management for the DynamicTabSwitcher component.
 * @internal
 */
export class DesktopDynamicTabSwitcherModel extends HoistModel implements DynamicTabSwitcherModel {
    declare config: DynamicTabSwitcherConfig;

    private readonly extraMenuItems: Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>>;
    private readonly actionTabSpecsById: Record<string, ActionTabSpec>;
    private readonly tabContainerModel: TabContainerModel;
    @observable.ref private visibleTabState: TabState[];

    @computed
    get favoriteTabIds(): string[] {
        return this.visibleTabState.filter(it => it.isFavorite).map(it => it.tabId);
    }

    @computed
    get visibleTabs(): Array<TabModel | ActionTab> {
        return compact(
            this.visibleTabState.map(
                it => this.tabContainerModel.findTab(it.tabId) ?? this.getActionTab(it.tabId)
            )
        );
    }

    @computed
    get enabledVisibleTabs(): Array<TabModel | ActionTab> {
        return this.visibleTabs.filter(it => !it.disabled);
    }

    constructor(
        {extraMenuItems = [], actionTabs = [], initialFavorites = []}: DynamicTabSwitcherConfig,
        tabContainerModel: TabContainerModel
    ) {
        super();
        makeObservable(this);

        this.extraMenuItems = extraMenuItems;
        this.actionTabSpecsById = keyBy(actionTabs, 'id');
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
        if (this.isTabVisible(tabId)) {
            this.visibleTabState = this.visibleTabState.map(it =>
                it.tabId === tabId ? {tabId, isFavorite: !this.isTabFavorite(tabId)} : it
            );
        } else {
            this.visibleTabState = [...this.visibleTabState, {tabId, isFavorite: true}];
        }
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

    getActionTab(tabId: string): ActionTab {
        const actionTab = this.actionTabSpecsById[tabId];
        if (!actionTab) return null;
        const {displayFn, ...rest} = this.actionTabSpecsById[tabId];
        const {hidden, ...ret} = displayFn
            ? {...rest, ...lodashOmit(displayFn(), ['id', 'actionFn'])}
            : rest;
        return hidden ? null : ret;
    }

    getContextMenuItems(
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        tab: TabModel | ActionTab
    ): Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>> {
        const isFavorite = this.isTabFavorite(tab.id);
        return [
            {
                icon: Icon.favorite({prefix: isFavorite ? 'fal' : 'fas'}),
                text: isFavorite ? 'Remove from Favorites' : 'Favorite',
                actionFn: () => this.toggleTabFavorite(tab.id)
            },
            ...this.extraMenuItems.map(item => this.buildMenuItem(item, {contextMenuEvent: e, tab}))
        ];
    }

    @action
    setFavoriteTabIds(tabIds: string[]) {
        this.visibleTabState = uniqBy(
            [
                ...this.getValidTabIds(tabIds).map(tabId => ({
                    tabId,
                    isFavorite: true
                })),
                {tabId: this.tabContainerModel.activeTabId, isFavorite: false}
            ],
            'tabId'
        );
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
    // Persistable Interface
    // -------------------------------
    getPersistableState(): PersistableState<{favoriteTabIds: string[]}> {
        return new PersistableState({favoriteTabIds: this.favoriteTabIds});
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    private activeTabReaction(): ReactionSpec<string> {
        return {
            track: () => this.tabContainerModel.activeTabId,
            run: tabId => {
                if (!this.isTabVisible(tabId)) {
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
        return !!(this.tabContainerModel.findTab(tabId) || this.getActionTab(tabId));
    }

    private isTabVisible(tabId: string): boolean {
        return this.visibleTabState.some(it => it.tabId === tabId);
    }

    private buildMenuItem(
        item: MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>,
        context: DynamicTabSwitcherMenuContext
    ): MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext> {
        if (!isMenuItem(item)) return item;
        const ret = {...item};
        if (item.actionFn) ret.actionFn = e => item.actionFn(e, context);
        if (item.prepareFn) ret.prepareFn = e => item.prepareFn(e, context);
        if (item.items) ret.items = item.items.map(it => this.buildMenuItem(it, context));
        return ret;
    }
}

interface TabState {
    tabId: string;
    isFavorite: boolean;
}
