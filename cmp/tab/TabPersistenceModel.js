/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';


/**
 * Model to manage persisting state from TabContainerModel.
 * @private
 */
@HoistModel
export class TabPersistenceModel {

    VERSION = 1;  // Increment to abandon state.
    gridModel;

    @observable.ref
    state;

    @managed
    provider;

    /**
     *
     * @param {TabContainerModel} tabContainerModel
     * @param {TabContainerModelPersistOptions} persistWith
     */
    constructor(
        tabContainerModel,
        {
            persistActiveTab = true,
            ...persistWith
        }
    ) {
        this.tabContainerModel = tabContainerModel;

        persistWith = {path: 'tabContainer', ...persistWith};

        // 1) Read state from and attach to provider -- fail gently
        try {
            this.provider = PersistenceProvider.create(persistWith);
            this.state = this.loadState() ?? {version: this.VERSION};
            this.addReaction({
                track: () => this.state,
                run: (state) => this.provider.write(state)
            });
        } catch (e) {
            console.error(e);
            this.state = {version: this.VERSION};
        }

        // 2) Bind self to tabContainer.
        if (persistActiveTab) {
            this.updateActiveTab();
            this.addReaction(this.activeTabReaction());
        }
    }

    @action
    clear() {
        this.state = {version: this.VERSION};
    }

    //--------------------------
    // Active Tab
    //--------------------------
    activeTabReaction() {
        return {
            track: () => this.tabContainerModel.activeTabId,
            run: (activeTabId) => {
                this.patchState({activeTabId});
            }
        };
    }

    updateActiveTab() {
        const {tabContainerModel, state} = this;
        if (!state.tabState.activeTabId) return;

        const tabState = this.cleanTabState(state.tabState);
        tabContainerModel.applyTabStateChanges(tabState);
    }

    //--------------------------
    // Other Implementation
    //--------------------------
    cleanTabState(tabState) {
        const {tabContainerModel} = this,
            tabs = tabContainerModel.tabs;

        // REMOVE an activeTabId that is no longer found in the tab set. It was likely saved
        // under a prior release of the app and has since been removed from the code.
        if (!tabs.find(it => it.id === tabState.activeTabId)) {
            delete tabState.activeTabId;
        }
    }

    @action
    patchState(updates) {
        this.state = {...this.state, ...updates};
    }

    loadState() {
        const ret = this.provider.read();
        return ret?.version === this.VERSION ? ret : null;
    }

}