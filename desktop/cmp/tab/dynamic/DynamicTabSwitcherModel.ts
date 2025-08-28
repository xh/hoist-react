import {TabContainerModel, TabModel} from '@xh/hoist/cmp/tab';
import {
    HoistModel,
    isMenuItem,
    MenuContext,
    MenuItemLike,
    MenuToken,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    ReactionSpec,
    XH
} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {showContextMenu} from '@xh/hoist/kit/blueprint';
import {makeObservable} from '@xh/hoist/mobx';
import {compact, find, first, uniqBy} from 'lodash';
import {action, computed, observable, when} from 'mobx';
import React from 'react';

export interface DynamicTabSwitcherConfig {
    /** Additional menu items to include in tab context menus. */
    extraMenuItems?: Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>>;
    /** IDs of favorite tabs to display by default (in order). */
    initialFavorites?: string[];
    /** Options governing persistence. */
    persistWith?: PersistOptions;
    /** TabContainerModel to which this switcher should bind. */
    tabContainerModel: TabContainerModel;
}

export interface DynamicTabSwitcherMenuContext extends MenuContext {
    tab: TabModel;
}

export class DynamicTabSwitcherModel
    extends HoistModel
    implements Persistable<{favoriteTabIds: string[]}>
{
    declare config: DynamicTabSwitcherConfig;

    private readonly extraMenuItems: Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>>;
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

    constructor({
        extraMenuItems = [],
        initialFavorites = [],
        persistWith = null,
        tabContainerModel
    }: DynamicTabSwitcherConfig) {
        super();
        makeObservable(this);

        this.extraMenuItems = extraMenuItems;
        this.tabContainerModel = tabContainerModel;
        this.visibleTabState = this.getValidTabIds(initialFavorites).map(tabId => ({
            tabId,
            isFavorite: true
        }));

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'dynamicTabSwitcher',
                    ...persistWith
                },
                target: this,
                owner: this
            });
        }

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
        this.visibleTabState = this.visibleTabState.filter(it => it.tabId !== tabId);
        const {enabledVisibleTabs, tabContainerModel} = this;
        if (tabContainerModel.activeTabId === tabId) {
            tabContainerModel.activateTab(first(enabledVisibleTabs));
        }
    }

    onContextMenu(e: React.MouseEvent<HTMLDivElement, MouseEvent>, tab: TabModel) {
        const isFavorite = this.isTabFavorite(tab.id),
            {left, bottom} = e.currentTarget.getBoundingClientRect();
        showContextMenu(
            contextMenu({
                menuItems: [
                    {
                        icon: Icon.favorite({prefix: isFavorite ? 'fal' : 'fas'}),
                        text: isFavorite ? 'Remove from Favorites' : 'Favorite',
                        actionFn: () => this.toggleTabFavorite(tab.id)
                    },
                    ...this.extraMenuItems.map(item =>
                        this.buildMenuItem(item, {contextMenuEvent: e, tab})
                    )
                ]
            }),
            {
                left,
                top: bottom
            }
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

    setPersistableState(state: PersistableState<{favoriteTabIds: string[]}>) {
        this.visibleTabState = uniqBy(
            [
                ...this.getValidTabIds(state.value.favoriteTabIds).map(tabId => ({
                    tabId,
                    isFavorite: true
                })),
                {tabId: this.tabContainerModel.activeTabId, isFavorite: false}
            ],
            'tabId'
        );
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
        return tabIds.filter(id => this.tabContainerModel.findTab(id));
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
