/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {badge} from '@xh/hoist/cmp/badge';
import {dateTimeCol, GridAutosizeMode, GridModel, TreeStyle} from '@xh/hoist/cmp/grid';
import {br, fragment, hbox, p, strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {
    buildViewGroupTree,
    isGroupSameOrDescendant,
    ViewGroupNode,
    ViewInfo,
    ViewManagerModel,
    ViewUpdateSpec
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, LoadSpec, managed, PlainObject, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {viewsGrid} from '@xh/hoist/desktop/cmp/viewmanager/dialog/ManageDialog';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, compact, every, groupBy, keys, some, startCase, uniqBy} from 'lodash';
import {ReactNode} from 'react';
import {EditGroupDialogModel} from './EditGroupDialogModel';
import {ViewMultiPanelModel} from './ViewMultiPanelModel';
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
    @managed viewMultiPanelModel: ViewMultiPanelModel;
    @managed editGroupDialogModel: EditGroupDialogModel;

    @managed tabContainerModel: TabContainerModel;

    @bindable.ref filter: FilterTestFn;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadObserver;
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
        // Null when a synthetic group row is selected - detail panel shows placeholder.
        return this.gridModel.selectedRecord?.data.view ?? null;
    }

    @computed
    get selectedViews(): ViewInfo[] {
        // Group rows expand to all views beneath them, respecting any active filter.
        const views = this.gridModel.selectedRecords.flatMap(rec =>
            rec.data.isGroupRow ? rec.descendants.map(it => it.data.view) : [rec.data.view]
        );
        return uniqBy(compact(views), 'token') as ViewInfo[];
    }

    /** True if any selected row is a synthetic group/owner row. */
    @computed
    get hasGroupRowsSelected(): boolean {
        return this.gridModel.selectedRecords.some(it => it.data.isGroupRow);
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
        this.viewManagerModel.selectViewAsync(this.selectedView).catchDefault();
        this.close();
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {tabContainerModel} = this,
            {enableGlobal, enableSharing, view, ownedViews, globalViews, sharedViews} =
                this.viewManagerModel;

        runInAction(() => {
            this.ownedGridModel.loadData(this.buildTreeData(ownedViews));
            tabContainerModel.setTabTitle('owned', this.ownedTabTitle);

            if (enableGlobal) {
                this.globalGridModel.loadData(this.buildTreeData(globalViews));
                tabContainerModel.setTabTitle('global', this.globalTabTitle);
            }

            if (enableSharing) {
                this.sharedGridModel.loadData(this.buildTreeData(sharedViews, true));
                tabContainerModel.setTabTitle('shared', this.sharedTabTitle);
            }
        });
        if (!loadSpec.isRefresh) {
            [this.ownedGridModel, this.globalGridModel, this.sharedGridModel].forEach(gm =>
                gm?.expandAll()
            );
        }
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

    async updateViewsAsync(views: ViewInfo[], update: ViewUpdateSpec) {
        return this.doUpdateViewsAsync(views, update).linkTo(this.updateTask).catchDefault();
    }

    /** Rename/re-parent a group, cascading to all views under it. */
    async renameGroupAsync(from: string, to: string, isGlobal: boolean) {
        return this.doRenameGroupAsync(from, to, isGlobal).linkTo(this.updateTask).catchDefault();
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
        this.viewMultiPanelModel = new ViewMultiPanelModel(this);
        this.editGroupDialogModel = new EditGroupDialogModel(this);

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
        const updated = await viewManagerModel.updateViewInfoAsync(view, update);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
        await this.selectViewAsync(updated.info); // reselect -- may have moved tabs!
    }

    private async doUpdateViewsAsync(views: ViewInfo[], update: ViewUpdateSpec) {
        const {viewManagerModel} = this;
        await viewManagerModel.updateViewsInfoAsync(views, update);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
        // No reselect -- views may have moved between tabs.
    }

    private async doRenameGroupAsync(from: string, to: string, isGlobal: boolean) {
        const {viewManagerModel} = this,
            views = isGlobal ? viewManagerModel.globalViews : viewManagerModel.ownedViews,
            anchor = views.find(v => isGroupSameOrDescendant(v.group, from));
        if (!anchor) return;

        // Server-side rename cascade excludes the target view itself, so set its own rewritten
        // group in the same update.
        await viewManagerModel.updateViewInfoAsync(anchor, {
            group: to + anchor.group.substring(from.length),
            groupRename: {from, to}
        });
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

    private async selectViewAsync(view: ViewInfo) {
        this.tabContainerModel.setActiveTabId(
            view.isOwned ? 'owned' : view.isGlobal ? 'global' : 'shared'
        );
        // Ensure the target is not hidden within a collapsed group before selecting.
        this.gridModel.expandAll();
        await this.gridModel.selectAsync(view.token);
    }

    /**
     * Convert views into hierarchical store data, with synthetic rows for their groups (nested to
     * any depth via slash-delimited group names) and, when `byOwner` (shared tab), for each owner.
     */
    private buildTreeData(views: ViewInfo[], byOwner: boolean = false): PlainObject[] {
        if (byOwner) {
            const viewsByOwner = groupBy(views, 'owner');
            return keys(viewsByOwner)
                .sort((a, b) => a.localeCompare(b))
                .map(owner => ({
                    id: `owner:${owner}`,
                    name: owner,
                    owner,
                    isGroupRow: true,
                    children: this.buildTreeData(viewsByOwner[owner]).map(child =>
                        child.isGroupRow ? {...child, id: `owner:${owner}|${child.id}`} : child
                    )
                }));
        }

        const {roots, ungrouped} = buildViewGroupTree(views);
        return [
            ...roots.map(node => this.groupNodeToTreeData(node)),
            ...ungrouped.map(view => this.viewToTreeData(view))
        ];
    }

    private groupNodeToTreeData(node: ViewGroupNode): PlainObject {
        return {
            id: `group:${node.path}`,
            name: node.name,
            group: node.path,
            isGroupRow: true,
            children: [
                ...node.children.map(child => this.groupNodeToTreeData(child)),
                ...node.views.map(view => this.viewToTreeData(view))
            ]
        };
    }

    private viewToTreeData(view: ViewInfo): PlainObject {
        return {
            id: view.token,
            name: view.name,
            group: view.group,
            owner: view.owner,
            lastUpdated: view.lastUpdated,
            isPinned: view.isPinned,
            isGroupRow: false,
            view
        };
    }

    private createGridModel(type: 'owned' | 'global' | 'shared'): GridModel {
        const {typeDisplayName, globalDisplayName} = this.viewManagerModel;

        const modifier =
            type == 'owned' ? `personal` : type == 'global' ? globalDisplayName : 'shared';

        return new GridModel({
            emptyText: `No ${modifier} ${pluralize(typeDisplayName)} found...`,
            // Sort groups above loose views among siblings, then alpha by name.
            sortBy: ['isGroupRow|desc', 'name'],
            treeMode: true,
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            selModel: 'multiple',
            contextMenu:
                type == 'shared'
                    ? null
                    : [
                          {
                              text: 'Edit Group',
                              icon: Icon.edit(),
                              displayFn: ({record}) => ({
                                  hidden:
                                      !record?.data.isGroupRow ||
                                      (type == 'global' && !this.viewManagerModel.manageGlobal)
                              }),
                              actionFn: ({record}) =>
                                  this.editGroupDialogModel.open(
                                      record.data.group,
                                      type == 'global'
                                  )
                          }
                      ],
            sizingMode: 'standard',
            hideHeaders: true,
            rowClassRules: {
                'xh-grid-clear-background-color': ({data}) => data && !data.data.isGroupRow
            },
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'group', type: 'string'},
                    {name: 'owner', type: 'string'},
                    {name: 'lastUpdated', type: 'date'},
                    {name: 'isPinned', type: 'bool'},
                    {name: 'isGroupRow', type: 'bool'},
                    {name: 'view', type: 'auto'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {field: 'name', flex: true, isTreeColumn: true},
                {field: 'isGroupRow', hidden: true},
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
                        if (record.data.isGroupRow) return null;
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
            ]
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
                            `This tab shows ${views} you have created.`,
                            br(),
                            `Pin ${views} to your menu for quick access. Use groups to nest them under sub-menus.`,
                            ...(enableSharing
                                ? [
                                      br(),
                                      `Opt-in to sharing any of your ${views} to make them discoverable by other users.`
                                  ]
                                : [''])
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
                        `This tab shows ${globalViews} available to everyone.`,
                        br(),
                        `${capitalize(globalViews)} appear by default in everyone's menu, but you can choose which ${views} you would like to see by pinning/unpinning them at any time.`
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
                        `This tab shows ${views} shared by other ${XH.appName} users.`,
                        br(),
                        `You can pin these ${views} to your menu for quick access. Only the owner will be able to save changes to a shared ${view}, but you can save a copy to make it your own.`
                    )
                })
            });
        }

        return new TabContainerModel({tabs});
    }

    private get ownedTabTitle(): ReactNode {
        return hbox(
            `My ${startCase(pluralize(this.viewManagerModel.typeDisplayName))}`,
            badge(this.viewCount(this.ownedGridModel))
        );
    }

    private get globalTabTitle(): ReactNode {
        const {globalDisplayName, typeDisplayName} = this.viewManagerModel;
        return hbox(
            `${startCase(globalDisplayName)} ${startCase(pluralize(typeDisplayName))}`,
            badge(this.viewCount(this.globalGridModel))
        );
    }

    private get sharedTabTitle(): ReactNode {
        return hbox(
            `Shared ${startCase(pluralize(this.viewManagerModel.typeDisplayName))}`,
            badge(this.viewCount(this.sharedGridModel))
        );
    }

    /** Count of actual views within a grid, excluding synthetic group/owner rows. */
    private viewCount(gridModel: GridModel): number {
        return gridModel.store.allRecords.filter(it => !it.data.isGroupRow).length;
    }
}
