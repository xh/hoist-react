import {TabContainerModel, TabModel} from '@xh/hoist/cmp/tab';
import {
    HoistModel,
    managed,
    MenuItemLike,
    NonEmptyArray,
    PersistenceProvider,
    PersistOptions,
    ReactionSpec,
    XH
} from '@xh/hoist/core';
import {contextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {showContextMenu} from '@xh/hoist/kit/blueprint';
import {makeObservable} from '@xh/hoist/mobx';
import {compact, first, isEmpty, isEqual, without} from 'lodash';
import {action, computed, observable, runInAction, when} from 'mobx';
import React from 'react';

export interface DynamicTabSwitcherConfig {
    /** IDs of tabs to show by default (in order) or `null` (default) to show all tabs. */
    defaultTabIds?: NonEmptyArray<string> | null;
    /** Options governing persistence. */
    persistWith?: PersistOptions;
    /** TabContainerModel to which this switcher should bind. */
    tabContainerModel: TabContainerModel;
}

export class DynamicTabSwitcherModel extends HoistModel {
    declare config: DynamicTabSwitcherConfig;

    @managed provider: PersistenceProvider;

    @observable.ref visibleTabIds: string[];

    private readonly defaultTabIds: string[];
    private readonly tabContainerModel: TabContainerModel;

    get activeTab(): TabModel {
        return this.tabContainerModel.activeTab;
    }

    @computed
    get visibleTabs(): TabModel[] {
        return compact(this.visibleTabIds.map(id => this.tabContainerModel.findTab(id)));
    }

    @computed
    get hiddenTabs(): TabModel[] {
        const visibleTabIds = new Set(this.visibleTabIds);
        return this.tabContainerModel.tabs.filter(tab => !visibleTabIds.has(tab.id));
    }

    constructor({
        defaultTabIds = null,
        persistWith = null,
        tabContainerModel
    }: DynamicTabSwitcherConfig) {
        super();
        makeObservable(this);

        this.tabContainerModel = tabContainerModel;

        const validDefaultIds = defaultTabIds && this.getValidTabIds(defaultTabIds);
        this.visibleTabIds = this.defaultTabIds = isEmpty(validDefaultIds)
            ? tabContainerModel.tabs.map(tab => tab.id)
            : validDefaultIds;

        if (persistWith) this.setupStateProvider(persistWith);

        // Wait for router to start before observing active tab
        when(
            () => XH.appIsRunning,
            () => this.addReaction(this.activeTabReaction())
        );
    }

    activate(tab: TabModel) {
        this.tabContainerModel.activateTab(tab);
    }

    @action
    hide(tabId: string) {
        this.visibleTabIds = without(this.visibleTabIds, tabId);
        const {tabContainerModel, visibleTabIds} = this;
        if (tabContainerModel.activeTabId === tabId)
            tabContainerModel.activateTab(first(visibleTabIds));
    }

    onContextMenu(e: React.MouseEvent<HTMLDivElement, MouseEvent>, tab: TabModel) {
        showContextMenu(
            contextMenu({
                menuItems: [
                    {
                        icon: Icon.x(),
                        text: 'Remove',
                        actionFn: () => this.hide(tab.id),
                        prepareFn: me => {
                            // Don't allow closing the last tab
                            me.disabled = this.visibleTabs.length === 1;
                        }
                    },
                    {
                        icon: Icon.add(),
                        text: 'Add',
                        items: this.hiddenTabActions(),
                        prepareFn: me => {
                            me.hidden = isEmpty(me.items);
                        }
                    },
                    '-',
                    this.resetDefaultAction()
                ]
            }),
            {
                left: e.clientX,
                top: e.clientY
            }
        );
    }

    @action
    onDragEnd(result) {
        if (!result.destination) return;
        const tabIds = this.visibleTabs.map(tab => tab.id),
            [removed] = tabIds.splice(result.source.index, 1);
        tabIds.splice(result.destination.index, 0, removed);
        this.visibleTabIds = tabIds;
    }

    hiddenTabActions(): MenuItemLike[] {
        return this.hiddenTabs.map(tab => ({
            text: tab.title,
            actionFn: () => this.activate(tab)
        }));
    }

    resetDefaultAction(): MenuItemLike {
        return {
            icon: Icon.reset(),
            text: 'Restore Default Tabs',
            intent: 'warning',
            actionFn: () =>
                runInAction(() => {
                    const {activeTab, defaultTabIds, tabContainerModel} = this;
                    this.visibleTabIds = defaultTabIds;
                    if (!defaultTabIds.includes(activeTab.id)) {
                        tabContainerModel.activateTab(first(defaultTabIds));
                    }
                }),
            prepareFn: me => {
                me.disabled = isEqual(this.visibleTabIds, this.defaultTabIds);
            }
        };
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private activeTabReaction(): ReactionSpec<string> {
        return {
            track: () => this.tabContainerModel.activeTabId,
            run: tabId => {
                if (!this.visibleTabIds.includes(tabId))
                    this.visibleTabIds = [...this.visibleTabIds, tabId];
            },
            fireImmediately: true
        };
    }

    private setupStateProvider(persistWith: PersistOptions) {
        // Read state from provider -- fail gently
        let visibleTabIds: string[] = this.visibleTabIds;
        try {
            this.provider = PersistenceProvider.create({
                path: 'dynamicTabSwitcher',
                ...persistWith
            });
            const state = this.provider.read();
            visibleTabIds = state?.visibleTabIds ?? visibleTabIds;
        } catch (e) {
            this.logError(e);
            XH.safeDestroy(this.provider);
            this.provider = null;
        }

        // Initialize state.
        this.visibleTabIds = this.getValidTabIds(visibleTabIds);

        // Attach to provider last
        if (this.provider) {
            this.addReaction({
                track: () => this.visibleTabIds,
                run: visibleTabIds => this.provider.write({visibleTabIds})
            });
        }
    }

    private getValidTabIds(tabIds: string[]): string[] {
        return tabIds.filter(id => this.tabContainerModel.findTab(id));
    }
}
