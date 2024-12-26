/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {badge} from '@xh/hoist/cmp/badge';
import {dateTimeCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {fragment, hbox, p, strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {ViewInfo, ViewManagerModel, ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, LoadSpec, managed, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {viewsGrid} from '@xh/hoist/desktop/cmp/viewmanager/dialog/ManageDialog';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, compact, every, isEmpty, some, startCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewPanelModel} from './ViewPanelModel';

/**
 * Backing model for ManageDialog
 */
export class ManageDialogModel extends HoistModel {
    viewManagerModel: ViewManagerModel;

    @observable isOpen: boolean = false;

    @managed ownedGridModel: GridModel;
    @managed globalGridModel: GridModel;
    @managed sharedGridModel: GridModel;

    @managed viewPanelModel: ViewPanelModel;

    @managed tabContainerModel: TabContainerModel;

    @bindable.ref filter: FilterTestFn;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadModel;
    }

    get gridModel(): GridModel {
        switch (this.tabContainerModel.activeTabId) {
            case 'global':
                return this.globalGridModel;
            case 'shared':
                return this.sharedGridModel;
            case 'owned':
            default:
                return this.ownedGridModel;
        }
    }

    @computed
    get selectedView(): ViewInfo {
        return this.gridModel.selectedRecord?.data.view;
    }

    @computed
    get selectedViews(): ViewInfo[] {
        return this.gridModel.selectedRecords.map(it => it.data.view) as ViewInfo[];
    }

    constructor(viewManagerModel: ViewManagerModel) {
        super();
        makeObservable(this);
        this.viewManagerModel = viewManagerModel;
    }

    @action
    open() {
        if (!this.tabContainerModel) this.init();
        this.loadAsync();
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    activateSelectedViewAndClose() {
        this.viewManagerModel.selectViewAsync(this.selectedView);
        this.close();
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {tabContainerModel} = this,
            {enableGlobal, enableSharing, view, ownedViews, globalViews, sharedViews} =
                this.viewManagerModel;

        runInAction(() => {
            this.ownedGridModel.loadData(ownedViews);
            tabContainerModel.setTabTitle('owned', this.ownedTabTitle);

            if (enableGlobal) {
                this.globalGridModel.loadData(globalViews);
                tabContainerModel.setTabTitle('global', this.globalTabTitle);
            }

            if (enableSharing) {
                this.sharedGridModel.loadData(sharedViews);
                tabContainerModel.setTabTitle('shared', this.sharedTabTitle);
            }
        });
        if (!loadSpec.isRefresh && !view.isDefault) {
            await this.selectViewAsync(view.info);
        }
    }

    async deleteAsync(views: ViewInfo[]) {
        return this.doDeleteAsync(views).linkTo(this.updateTask).catchDefault();
    }

    async updateAsync(view: ViewInfo, update: ViewUpdateSpec) {
        return this.doUpdateAsync(view, update).linkTo(this.updateTask).catchDefault();
    }

    async makeGlobalAsync(view: ViewInfo) {
        return this.doMakeGlobalAsync(view).linkTo(this.updateTask).catchDefault();
    }

    @action
    togglePinned(views: ViewInfo[]) {
        const allPinned = every(views, 'isPinned'),
            {viewManagerModel} = this;
        views.forEach(v =>
            allPinned ? viewManagerModel.userUnpin(v) : viewManagerModel.userPin(v)
        );
        this.refreshAsync();
    }

    //------------------------
    // Implementation
    //------------------------
    private init() {
        const {enableGlobal, enableSharing} = this.viewManagerModel;

        this.ownedGridModel = this.createGridModel('owned');
        if (enableGlobal) this.globalGridModel = this.createGridModel('global');
        if (enableSharing) this.sharedGridModel = this.createGridModel('shared');
        const gridModels = compact([
            this.ownedGridModel,
            this.globalGridModel,
            this.sharedGridModel
        ]);

        this.tabContainerModel = this.createTabContainerModel();
        this.viewPanelModel = new ViewPanelModel(this);

        this.addReaction({
            track: () => this.filter,
            run: f => gridModels.forEach(m => m.store.setFilter(f)),
            fireImmediately: true
        });

        // Only allow one selection at a time across all grids
        if (gridModels.length > 1) {
            gridModels.forEach(gm => {
                this.addReaction({
                    track: () => gm.hasSelection,
                    run: hasSelection => {
                        gridModels.forEach(it => {
                            if (it != gm && hasSelection) it.clearSelection();
                        });
                    }
                });
            });
        }
    }

    private async doUpdateAsync(view: ViewInfo, update: ViewUpdateSpec) {
        const {viewManagerModel} = this;
        await viewManagerModel.updateViewInfoAsync(view, update);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    private async doDeleteAsync(views: ViewInfo[]) {
        const {viewManagerModel} = this,
            {typeDisplayName} = viewManagerModel,
            count = views.length;

        if (!count) return;

        const confirmStr = count > 1 ? pluralize(typeDisplayName, count, true) : views[0].typedName;
        const msgs: ReactNode[] = [`Are you sure you want to delete ${confirmStr}?`];
        if (some(views, v => v.isGlobal || v.isShared)) {
            count > 1
                ? msgs.push(
                      strong(
                          `This includes at least one public ${typeDisplayName}, to be deleted for all users.`
                      )
                  )
                : msgs.push(
                      strong(
                          `This is a public ${typeDisplayName} and will be deleted for all users.`
                      )
                  );
        }

        const confirmed = await XH.confirm({
            message: fragment(msgs.map(m => p(m))),
            confirmProps: {
                text: `Yes, delete ${pluralize(typeDisplayName, count)}`,
                outlined: true,
                autoFocus: false,
                intent: 'danger'
            }
        });
        if (!confirmed) return;

        return viewManagerModel.deleteViewsAsync(views).finally(() => this.refreshAsync());
    }

    private async doMakeGlobalAsync(view: ViewInfo) {
        const {globalDisplayName, typeDisplayName} = this.viewManagerModel,
            {typedName} = view,
            msgs = [
                `The ${typedName} will become a ${globalDisplayName} ${typeDisplayName} visible to all other ${XH.appName} users.`,
                strong('Are you sure you want to proceed?')
            ];

        const confirmed = await XH.confirm({
            message: fragment(msgs.map(m => p(m))),
            confirmProps: {
                text: `Yes, change visibility`,
                outlined: true,
                autoFocus: false,
                intent: 'primary'
            }
        });
        if (!confirmed) return;

        const {viewManagerModel} = this;
        const updated = await viewManagerModel.makeViewGlobalAsync(view);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
        await this.selectViewAsync(updated.info); // reselect -- will have moved tabs!
    }

    private async selectViewAsync(view: ViewInfo) {
        this.tabContainerModel.activateTab(
            view.isOwned ? 'owned' : view.isGlobal ? 'global' : 'shared'
        );
        await this.gridModel.selectAsync(view.token);
    }

    private createGridModel(type: 'owned' | 'global' | 'shared'): GridModel {
        const {typeDisplayName, globalDisplayName} = this.viewManagerModel;

        const modifier =
            type == 'owned' ? `personal` : type == 'global' ? globalDisplayName : 'shared';

        return new GridModel({
            emptyText: `No ${modifier} ${pluralize(typeDisplayName)} found...`,
            sortBy: 'name',
            showGroupRowCounts: false,
            groupBy: ['group'],
            selModel: 'multiple',
            contextMenu: null,
            sizingMode: 'standard',
            hideHeaders: true,
            store: {
                idSpec: 'token',
                processRawData: v => ({
                    name: v.name,
                    group: v.isGlobal || v.isOwned ? v.group : v.owner,
                    owner: v.owner,
                    lastUpdated: v.lastUpdated,
                    isPinned: v.isPinned,
                    view: v
                }),
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'group', type: 'string'},
                    {name: 'owner', type: 'string'},
                    {name: 'lastUpdated', type: 'date'},
                    {name: 'isPinned', type: 'bool'},
                    {name: 'view', type: 'auto'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {field: 'name', flex: true},
                {field: 'group', hidden: true},
                {field: 'owner', hidden: true},
                {field: 'lastUpdated', ...dateTimeCol, hidden: true},
                {
                    field: 'isPinned',
                    width: 40,
                    align: 'center',
                    headerName: Icon.pin(),
                    headerTooltip: 'Pin to menu',
                    renderer: (isPinned, {record}) => {
                        return button({
                            icon: Icon.pin({
                                prefix: isPinned ? 'fas' : 'fal',
                                className: isPinned ? 'xh-yellow' : 'xh-text-color-muted'
                            }),
                            tooltip: isPinned ? 'Unpin from menu' : 'Pin to menu',
                            onClick: () => {
                                this.togglePinned([record.data.view]);
                            }
                        });
                    }
                }
            ],
            groupRowRenderer: ({value}) => (isEmpty(value) ? 'Ungrouped' : value)
        });
    }

    private createTabContainerModel(): TabContainerModel {
        const {enableGlobal, enableSharing, globalDisplayName, typeDisplayName} =
                this.viewManagerModel,
            view = typeDisplayName,
            views = pluralize(view),
            globalViews = `${globalDisplayName} ${views}`,
            tabs = [
                {
                    id: 'owned',
                    title: this.ownedTabTitle,
                    content: viewsGrid({
                        model: this.ownedGridModel,
                        helpText: fragment(
                            Icon.user(),
                            `This tab shows ${views} you have created. Pinned ${views} are shown in your menu for quick access. Set a group on ${views} to show them together in a sub-menu. `,
                            enableSharing
                                ? `Opt-in to sharing any of your ${views} to make them discoverable by other users.`
                                : ''
                        )
                    })
                }
            ];

        if (enableGlobal) {
            tabs.push({
                id: 'global',
                title: this.globalTabTitle,
                content: viewsGrid({
                    model: this.globalGridModel,
                    helpText: fragment(
                        Icon.globe(),
                        `This tab shows ${globalViews} available to everyone. ${capitalize(globalViews)} can be pinned by default so they appear automatically in everyone's menu, but you can choose which ${views} you would like to see by pinning/unpinning them at any time.`
                    )
                })
            });
        }

        if (enableSharing) {
            tabs.push({
                id: 'shared',
                title: this.sharedTabTitle,
                content: viewsGrid({
                    model: this.sharedGridModel,
                    helpText: fragment(
                        Icon.users(),
                        `This tab shows ${views} shared by other ${XH.appName} users. You can pin these ${views} to add them to your menu and access them directly. Only the owner will be able to save changes to a shared ${view}, but you can save as a copy to make it your own.`
                    )
                })
            });
        }

        return new TabContainerModel({tabs});
    }

    private get ownedTabTitle(): ReactNode {
        return hbox(
            `My ${startCase(pluralize(this.viewManagerModel.typeDisplayName))}`,
            badge(this.ownedGridModel.store.allCount)
        );
    }

    private get globalTabTitle(): ReactNode {
        const {globalDisplayName, typeDisplayName} = this.viewManagerModel;
        return hbox(
            `${startCase(globalDisplayName)} ${startCase(pluralize(typeDisplayName))}`,
            badge(this.globalGridModel.store.allCount)
        );
    }

    private get sharedTabTitle(): ReactNode {
        return hbox(
            `Shared ${startCase(pluralize(this.viewManagerModel.typeDisplayName))}`,
            badge(this.sharedGridModel.store.allCount)
        );
    }
}
