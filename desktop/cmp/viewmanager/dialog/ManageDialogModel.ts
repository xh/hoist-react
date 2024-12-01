/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {grid, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, LoadSpec, lookup, managed, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn} from '@xh/hoist/data';
import {computed} from 'mobx';
import {ReactNode} from 'react';
import {EditFormModel} from './EditFormModel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {ViewInfo, ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {find, some, startCase} from 'lodash';

/**
 * Backing model for ManageDialog
 */
export class ManageDialogModel extends HoistModel {
    @lookup(() => ViewManagerModel)
    viewManagerModel: ViewManagerModel;

    @managed privateGridModel: GridModel;
    @managed globalGridModel: GridModel;
    @managed editFormModel: EditFormModel;
    @managed tabContainerModel: TabContainerModel;

    @bindable filter: FilterTestFn;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadModel;
    }

    get gridModel(): GridModel {
        return this.tabContainerModel.activeTabId == 'global'
            ? this.globalGridModel
            : this.privateGridModel;
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

    get enableFavorites(): boolean {
        return this.viewManagerModel.enableFavorites;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    close() {
        this.viewManagerModel.closeManageDialog();
    }

    override onLinked() {
        super.onLinked();

        this.privateGridModel = this.createGridModel('personal');
        this.globalGridModel = this.createGridModel(this.globalDisplayName);
        this.tabContainerModel = this.createTabContainerModel();
        this.editFormModel = new EditFormModel(this);

        const {privateGridModel, globalGridModel, editFormModel} = this;
        this.addReaction(
            {
                track: () => this.selectedView,
                run: r => editFormModel.setView(r)
            },
            {
                track: () => this.filter,
                run: f => {
                    privateGridModel.store.setFilter(f);
                    globalGridModel.store.setFilter(f);
                },
                fireImmediately: true
            },
            {
                track: () => privateGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) globalGridModel.clearSelection();
                }
            },
            {
                track: () => globalGridModel.selectedRecords,
                run: recs => {
                    if (recs.length) privateGridModel.clearSelection();
                }
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {viewManagerModel} = this;
        this.globalGridModel.loadData(viewManagerModel.globalViews);
        this.privateGridModel.loadData(viewManagerModel.privateViews);
        if (!loadSpec.isRefresh) {
            await this.selectViewAsync(viewManagerModel.view.info);
        }
    }

    async deleteAsync(views: ViewInfo[]) {
        return this.doDeleteAsync(views).linkTo(this.updateTask).catchDefault();
    }

    async updateAsync(view: ViewInfo, name: string, description: string, isGlobal: boolean) {
        return this.doUpdateAsync(view, name, description, isGlobal)
            .linkTo(this.updateTask)
            .catchDefault();
    }

    //------------------------
    // Implementation
    //------------------------
    private async doUpdateAsync(
        view: ViewInfo,
        name: string,
        description: string,
        isGlobal: boolean
    ) {
        const {viewManagerModel} = this;

        await viewManagerModel.updateViewAsync(view, name, description, isGlobal);
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
        if (some(views, 'isGlobal')) {
            count > 1
                ? msgs.push(strong('These global views will no longer be available to ALL users.'))
                : msgs.push(strong('This global view will no longer be available to ALL users.'));
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
            await viewManagerModel.deleteViewAsync(view);
        }

        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    async selectViewAsync(view: ViewInfo) {
        this.tabContainerModel.activateTab(view.isGlobal ? 'global' : 'private');
        await this.gridModel.selectAsync(view.token);
    }

    private createGridModel(name: string): GridModel {
        return new GridModel({
            emptyText: `No ${name} ${pluralize(this.typeDisplayName)} found...`,
            sortBy: 'name',
            hideHeaders: true,
            showGroupRowCounts: false,
            selModel: 'multiple',
            contextMenu: null,
            sizingMode: 'standard',
            store: {
                idSpec: 'token',
                processRawData: v => ({name: v.name, isFavorite: v.isFavorite, info: v}),
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'isFavorite', type: 'bool'},
                    {name: 'info', type: 'auto'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {field: 'name', flex: true},
                {
                    colId: 'isFavorite',
                    field: 'info',
                    omit: !this.enableFavorites,
                    width: 40,
                    align: 'center',
                    headerName: Icon.favorite(),
                    highlightOnChange: true,
                    renderer: v => {
                        const {isFavorite} = v;
                        return Icon.favorite({
                            prefix: isFavorite ? 'fas' : 'fal',
                            className: isFavorite ? 'xh-yellow' : 'xh-text-color-muted'
                        });
                    }
                }
            ],
            onCellClicked: ({colDef, data: record, api}) => {
                if (colDef.colId === 'isFavorite') {
                    this.viewManagerModel.toggleFavorite(record.id);
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
                    content: grid({model: this.privateGridModel})
                },
                {
                    id: 'global',
                    title: `${startCase(this.globalDisplayName)} ${pluralType}`,
                    content: grid({model: this.globalGridModel})
                }
            ]
        });
    }
}
