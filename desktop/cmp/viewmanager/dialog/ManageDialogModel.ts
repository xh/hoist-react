/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {badge} from '@xh/hoist/cmp/badge';
import {compactDateCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {fragment, hbox, p, strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, LoadSpec, managed, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn} from '@xh/hoist/data';
import {viewsGrid} from '@xh/hoist/desktop/cmp/viewmanager/dialog/ManageDialog';
import {ReactNode} from 'react';
import {EditFormModel} from './EditFormModel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, computed, observable, action} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {ViewInfo, ViewManagerModel, ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager';
import {isEmpty, partition, some, startCase} from 'lodash';
import {button} from '@xh/hoist/desktop/cmp/button';

/**
 * Backing model for ManageDialog
 */
export class ManageDialogModel extends HoistModel {
    viewManagerModel: ViewManagerModel;

    @observable isOpen: boolean = false;

    @managed ownedGridModel: GridModel;
    @managed otherGridModel: GridModel;
    @managed editFormModel: EditFormModel;
    @managed tabContainerModel: TabContainerModel;

    @bindable.ref filter: FilterTestFn;
    @bindable.ref showInGroups: boolean;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadModel;
    }

    get gridModel(): GridModel {
        return this.tabContainerModel.activeTabId == 'other'
            ? this.otherGridModel
            : this.ownedGridModel;
    }

    @computed
    get selectedView(): ViewInfo {
        return this.gridModel.selectedRecord?.data.view;
    }

    @computed
    get selectedViews(): ViewInfo[] {
        return this.gridModel.selectedRecords.map(it => it.data.view) as ViewInfo[];
    }

    get canDelete(): boolean {
        const {viewManagerModel, selectedViews} = this,
            {views, enableDefault} = viewManagerModel;

        if (!selectedViews.every(v => v.isEditable)) return false;

        // Can't delete all the views, unless default mode is enabled.
        return enableDefault || views.length - selectedViews.length > 0;
    }

    get manageGlobal(): boolean {
        return this.viewManagerModel.manageGlobal;
    }

    get typeDisplayName(): string {
        return this.viewManagerModel.typeDisplayName;
    }

    get globalDisplayName(): string {
        return this.viewManagerModel.globalDisplayName;
    }

    get enableSharing(): boolean {
        return this.viewManagerModel.enableSharing;
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

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {tabContainerModel} = this,
            {view, views} = this.viewManagerModel,
            [ownedViews, otherViews] = partition(views, 'isOwned');
        this.ownedGridModel.loadData(ownedViews);
        this.otherGridModel.loadData(otherViews);
        tabContainerModel.setTabTitle('owned', this.ownedTabTitle);
        tabContainerModel.setTabTitle('other', this.otherTabTitle);
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

    async toggleGlobalAsync(view: ViewInfo) {
        return this.doToggleGlobalAsync(view).linkTo(this.updateTask).catchDefault();
    }

    //------------------------
    // Implementation
    //------------------------
    private init() {
        this.ownedGridModel = this.createGridModel('owned');
        this.otherGridModel = this.createGridModel('other');
        this.tabContainerModel = this.createTabContainerModel();
        this.editFormModel = new EditFormModel(this);

        const {ownedGridModel, otherGridModel, editFormModel} = this;
        this.addReaction(
            {
                track: () => this.selectedView,
                run: r => editFormModel.setView(r),
                fireImmediately: true
            },
            {
                track: () => this.filter,
                run: f => {
                    ownedGridModel.store.setFilter(f);
                    otherGridModel.store.setFilter(f);
                },
                fireImmediately: true
            },
            {
                track: () => this.showInGroups,
                run: showInGroups => {
                    const groupBy = showInGroups ? ['group'] : null;
                    this.ownedGridModel.groupBy = groupBy;
                    this.otherGridModel.groupBy = groupBy;
                },
                fireImmediately: true
            },
            {
                track: () => otherGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) ownedGridModel.clearSelection();
                }
            },
            {
                track: () => ownedGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) otherGridModel.clearSelection();
                }
            }
        );
    }

    private async doUpdateAsync(view: ViewInfo, update: ViewUpdateSpec) {
        const {viewManagerModel} = this;
        await viewManagerModel.api.updateViewInfoAsync(view, update);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    private async doDeleteAsync(views: ViewInfo[]) {
        const {viewManagerModel, typeDisplayName} = this,
            count = views.length;

        if (!count) return;

        const confirmStr = count > 1 ? pluralize(typeDisplayName, count, true) : views[0].typedName;
        const msgs: ReactNode[] = [`Are you sure you want to delete ${confirmStr}?`];
        if (some(views, v => v.isGlobal || v.isShared)) {
            count > 1
                ? msgs.push(strong('Some public views will no longer be available to ALL users.'))
                : msgs.push(strong('This public view will no longer be available to ALL users.'));
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

        for (const view of views) {
            await viewManagerModel.api.deleteViewAsync(view);
        }

        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    private async doToggleGlobalAsync(view: ViewInfo) {
        const {globalDisplayName, typeDisplayName} = this.viewManagerModel,
            {typedName} = view;
        const msg: ReactNode = view.isGlobal
            ? `The ${typedName} will become a personal ${typeDisplayName} and will no longer be visible to ALL other ${XH.appName} users.`
            : `The ${typedName} will become a ${globalDisplayName} ${typeDisplayName} visible to ALL other ${XH.appName} users.`;
        const msgs = [msg, strong('Are you sure you want to proceed?')];

        const confirmed = await XH.confirm({
            message: fragment(msgs.map(m => p(m))),
            confirmProps: {
                text: `Yes, change visibility`,
                outlined: true,
                autoFocus: false,
                intent: 'danger'
            }
        });
        if (!confirmed) return;

        const {viewManagerModel} = this;
        const updated = await viewManagerModel.api.toggleViewIsGlobalAsync(view);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
        await this.selectViewAsync(updated.info); // reselect -- will have moved tabs!
    }

    private async selectViewAsync(view: ViewInfo) {
        this.tabContainerModel.activateTab(view.isOwned ? 'owned' : 'other');
        await this.gridModel.selectAsync(view.token);
    }

    private createGridModel(type: 'owned' | 'other'): GridModel {
        const {typeDisplayName, globalDisplayName, viewManagerModel} = this;
        const isOwned = type == 'owned';
        const emptyText = isOwned
            ? `No personal ${pluralize(typeDisplayName)} found...`
            : `No public ${pluralize(typeDisplayName)} found...`;

        return new GridModel({
            emptyText,
            sortBy: 'name',
            showGroupRowCounts: false,
            selModel: 'multiple',
            contextMenu: null,
            sizingMode: 'standard',
            store: {
                idSpec: 'token',
                processRawData: v => ({
                    name: v.name,
                    group: v.isGlobal || v.isOwned ? v.group : v.owner,
                    owner: v.owner ?? globalDisplayName,
                    lastUpdated: v.lastUpdated,
                    view: v
                }),
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'group', type: 'string'},
                    {name: 'owner', type: 'string'},
                    {name: 'lastUpdated', type: 'date'},
                    {name: 'view', type: 'auto'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {
                    colId: 'isPinned',
                    field: 'view',
                    width: 40,
                    align: 'center',
                    headerName: Icon.pin(),
                    headerTooltip: 'Pin to menu',
                    renderer: (v, {gridModel}) => {
                        const {isPinned} = v;
                        return button({
                            icon: Icon.pin({
                                prefix: isPinned ? 'fas' : 'fal',
                                className: isPinned ? 'xh-yellow' : 'xh-text-color-muted'
                            }),
                            tooltip: isPinned ? 'Unpin from menu' : 'Pin to menu',
                            onClick: () => {
                                viewManagerModel.togglePinned(v);
                                gridModel.agApi.redrawRows();
                            }
                        });
                    }
                },
                {field: 'name', flex: true},
                {field: 'owner', hidden: isOwned, width: 150},
                {field: 'group', hidden: true},
                {field: 'lastUpdated', ...compactDateCol, hidden: !isOwned, width: 150}
            ],
            groupRowRenderer: ({value}) => (isEmpty(value) ? '*Ungrouped*' : value)
        });
    }

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            tabs: [
                {
                    id: 'owned',
                    title: this.ownedTabTitle,
                    content: viewsGrid({model: this.ownedGridModel})
                },
                {
                    id: 'other',
                    title: this.otherTabTitle,
                    content: viewsGrid({model: this.otherGridModel})
                }
            ]
        });
    }

    private get ownedTabTitle(): ReactNode {
        const title = `My ${startCase(pluralize(this.typeDisplayName))}`,
            store = this.ownedGridModel.store;
        return !store.empty ? hbox(title, badge(store.allCount)) : title;
    }

    private get otherTabTitle(): ReactNode {
        const title = `Public ${startCase(pluralize(this.typeDisplayName))}`,
            store = this.otherGridModel.store;
        return !store.empty ? hbox(title, badge(store.allCount)) : title;
    }
}
