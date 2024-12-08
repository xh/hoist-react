/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {grid, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, LoadSpec, managed, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn} from '@xh/hoist/data';
import {ReactNode} from 'react';
import {EditFormModel} from './EditFormModel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, computed, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {ViewInfo, ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {find, some, startCase} from 'lodash';
import {ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager/ViewToBlobApi';
import {action} from 'mobx';

/**
 * Backing model for ManageDialog
 */
export class ManageDialogModel extends HoistModel {
    viewManagerModel: ViewManagerModel;

    @observable isOpen: boolean = true;

    @managed ownedGridModel: GridModel;
    @managed sharedGridModel: GridModel;
    @managed editFormModel: EditFormModel;
    @managed tabContainerModel: TabContainerModel;

    @bindable filter: FilterTestFn;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadModel;
    }

    get gridModel(): GridModel {
        return this.tabContainerModel.activeTabId == 'shared'
            ? this.sharedGridModel
            : this.ownedGridModel;
    }

    @computed
    get selectedView(): ViewInfo {
        return this.gridModel.selectedRecord?.data.info;
    }

    @computed
    get selectedViews(): ViewInfo[] {
        return this.gridModel.selectedRecords.map(it => it.data.info) as ViewInfo[];
    }

    get canDelete(): boolean {
        const {viewManagerModel, manageGlobal, selectedViews} = this,
            {views, enableDefault} = viewManagerModel;

        // Can't delete global views without role.
        if (!manageGlobal && selectedViews.some(v => v.isGlobal)) return false;

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
        const {view, ownedViews, sharedViews} = this.viewManagerModel;
        this.ownedGridModel.loadData(ownedViews);
        this.sharedGridModel.loadData(sharedViews);
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

    //------------------------
    // Implementation
    //------------------------
    private init() {
        this.ownedGridModel = this.createGridModel('personal');
        this.sharedGridModel = this.createGridModel('shared');
        this.tabContainerModel = this.createTabContainerModel();
        this.editFormModel = new EditFormModel(this);

        const {ownedGridModel, sharedGridModel, editFormModel} = this;
        this.addReaction(
            {
                track: () => this.selectedView,
                run: r => editFormModel.setView(r)
            },
            {
                track: () => this.filter,
                run: f => {
                    ownedGridModel.store.setFilter(f);
                    sharedGridModel.store.setFilter(f);
                },
                fireImmediately: true
            },
            {
                track: () => sharedGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) ownedGridModel.clearSelection();
                }
            },
            {
                track: () => sharedGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) ownedGridModel.clearSelection();
                }
            }
        );
    }

    private async doUpdateAsync(view: ViewInfo, update: ViewUpdateSpec) {
        const {viewManagerModel} = this;

        await viewManagerModel.api.updateViewInfoAsync(view, update);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();

        // reselect the updated copy of this view -- it may have moved.
        await this.selectViewAsync(find(viewManagerModel.views, {token: view.token}));
    }

    private async doDeleteAsync(views: ViewInfo[]) {
        const {viewManagerModel, typeDisplayName} = this,
            {enableDefault} = viewManagerModel,
            count = views.length;

        if (!count) return;

        if (viewManagerModel.views.length === count && !enableDefault) {
            throw XH.exception({
                message: `You cannot delete all ${pluralize(typeDisplayName)}.`,
                isRoutine: true
            });
        }

        const confirmStr = count > 1 ? pluralize(typeDisplayName, count, true) : views[0].typedName;
        const msgs: ReactNode[] = [`Are you sure you want to delete ${confirmStr}?`];
        if (some(views, 'isShared')) {
            count > 1
                ? msgs.push(strong('These shared views will no longer be available to ALL users.'))
                : msgs.push(strong('This shared view will no longer be available to ALL users.'));
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

    async selectViewAsync(view: ViewInfo) {
        this.tabContainerModel.activateTab(view.isOwned ? 'owned' : 'shared');
        await this.gridModel.selectAsync(view.token);
    }

    private createGridModel(name: string): GridModel {
        const {typeDisplayName, viewManagerModel} = this;
        return new GridModel({
            emptyText: `No ${name} ${pluralize(typeDisplayName)} found...`,
            sortBy: 'name',
            hideHeaders: true,
            showGroupRowCounts: false,
            selModel: 'multiple',
            contextMenu: null,
            sizingMode: 'standard',
            store: {
                idSpec: 'token',
                processRawData: v => ({
                    name: v.name,
                    group: v.group,
                    isPinned: v.isPinned,
                    info: v
                }),
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'owner', type: 'string'},
                    {name: 'info', type: 'auto'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {field: 'name', flex: true},
                {field: 'group', hidden: true},
                {field: 'owner'},
                {
                    colId: 'isPinned',
                    field: 'info',
                    width: 40,
                    align: 'center',
                    headerName: Icon.pin(),
                    highlightOnChange: true,
                    renderer: v => {
                        const {isUserPinned, isPinned} = v;
                        if (!isPinned) return Icon.placeholder();
                        return Icon.pin({
                            prefix: isUserPinned ? 'fas' : 'fal',
                            className: isUserPinned ? 'xh-green' : 'xh-text-color-muted'
                        });
                    }
                }
            ],
            onCellClicked: ({colDef, data: record, api}) => {
                if (colDef.colId === 'isPinned') {
                    viewManagerModel.togglePinned(record.data.info);
                    api.redrawRows();
                }
            }
        });
    }

    private createTabContainerModel(): TabContainerModel {
        const pluralType = startCase(pluralize(this.typeDisplayName));
        return new TabContainerModel({
            tabs: [
                {
                    id: 'private',
                    title: `My ${pluralType}`,
                    content: grid({model: this.ownedGridModel})
                },
                {
                    id: 'shared',
                    title: `Shared ${pluralType}`,
                    content: grid({model: this.sharedGridModel})
                }
            ]
        });
    }
}
