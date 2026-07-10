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
    composeGroupPath,
    getGroupLeaf,
    isGroupSameOrDescendant,
    ViewGroupNode,
    ViewInfo,
    ViewManagerModel,
    ViewUpdateSpec
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, LoadSpec, managed, PlainObject, TaskObserver, XH} from '@xh/hoist/core';
import {FilterTestFn, RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {viewsGrid} from '@xh/hoist/desktop/cmp/viewmanager/dialog/ManageDialog';
import {Icon} from '@xh/hoist/icon';
import {GridOptions} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, compact, every, groupBy, isEqual, keys, some, startCase, uniqBy} from 'lodash';
import {ReactNode} from 'react';
import {RenameGroupDialogModel} from './editpanels/RenameGroupDialogModel';
import {ViewMultiPanelModel} from './editpanels/ViewMultiPanelModel';
import {ViewPanelModel} from './editpanels/ViewPanelModel';

/** Sentinel id marking the top level (outside all groups) as a pending drop target. */
const TOP_LEVEL_DROP_ID = 'xh-top-level-drop';

type GridType = 'owned' | 'global' | 'shared';

/** Resolved drop target - a group row id + path, or the top-level sentinel (null path). */
interface DropTarget {
    id: string;
    path: string;
}

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
    @managed renameGroupDialogModel: RenameGroupDialogModel;

    @managed tabContainerModel: TabContainerModel;

    @bindable.ref filter: FilterTestFn;

    /** Pending row-drag drop target within one of the grids, for highlighting. */
    @observable.ref private dropTarget: {type: GridType; id: string} = null;

    /** Cleanup for the one-shot drop listener armed by dragging out past the top of a grid. */
    private outsideDropCleanup: () => void = null;

    readonly updateTask = TaskObserver.trackLast();

    get loadTask(): TaskObserver {
        return this.viewManagerModel.loadObserver;
    }

    get gridType(): 'owned' | 'global' | 'shared' {
        switch (this.tabContainerModel.activeTabId) {
            case 'global':
                return 'global';
            case 'shared':
                return 'shared';
            default:
                return 'owned';
        }
    }

    get gridModel(): GridModel {
        return this.gridModelFor(this.gridType);
    }

    @computed
    get selectedView(): ViewInfo {
        // Null unless the selection resolves to exactly one view — directly or via a single-view group row
        return (
            this.gridModel.selectedRecord?.data.view ??
            (this.selectedViews.length === 1 ? this.selectedViews[0] : null)
        );
    }

    @computed
    get selectedViews(): ViewInfo[] {
        // Group rows expand to all views beneath them, respecting any active filter.
        const views = this.gridModel.selectedRecords.flatMap(rec =>
            rec.data.isGroupRow ? rec.descendants.map(it => it.data.view) : [rec.data.view]
        );
        return uniqBy(compact(views), 'token') as ViewInfo[];
    }

    /** The selected group row, when it is the sole selection. */
    @computed
    get selectedGroupRecord(): StoreRecord {
        const recs = this.gridModel.selectedRecords;
        return recs.length === 1 && recs[0].data.isGroupRow ? recs[0] : null;
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
        this.disarmOutsideDrop();
        if (this.renameGroupDialogModel) this.renameGroupDialogModel.isRenameDialogOpen = false;
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

    /** Pass `groupName` when deleting the full contents of a group, to contextualize the confirm. */
    async deleteAsync(views: ViewInfo[], groupName?: string) {
        return this.doDeleteAsync(views, groupName).linkTo(this.updateTask).catchDefault();
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

    /**
     * Row-drag GridOptions for one of this dialog's grids, applied via the grid's agOptions.
     * Drops move the dragged views/group immediately - no save step, with a confirm only when
     * the move affects any global view. Empty on grids that do not support drag-and-drop.
     * Requires ag-Grid's `RowDragModule` to be registered.
     */
    getRowDragAgOptions(gridModel: GridModel): GridOptions {
        const type = this.gridTypeFor(gridModel);
        if (!this.dragDropEnabled(type)) return {};

        const {typeDisplayName} = this.viewManagerModel;
        return {
            rowDragMultiRow: true,
            rowDragText: (params, dragItemCount) => {
                const rec = params.rowNode?.data as StoreRecord;
                if (rec?.data.isGroupRow) return `Group "${rec.data.name}"`;
                return dragItemCount === 1
                    ? `${capitalize(typeDisplayName)} "${rec?.data.name}"`
                    : pluralize(typeDisplayName, dragItemCount, true);
            },
            onRowDragEnter: () => this.disarmOutsideDrop(),
            onRowDragMove: e => this.onRowDragMove(type, e),
            onRowDragLeave: e => this.onRowDragLeave(type, e),
            onRowDragCancel: () => {
                this.disarmOutsideDrop();
                this.setDropTarget(type, null);
            },
            onRowDragEnd: e => this.onRowDragEnd(type, e)
        };
    }

    /** True when a drag within `gridModel` is pending a drop onto the top level. */
    isTopLevelDropTarget(gridModel: GridModel): boolean {
        const {dropTarget} = this;
        return (
            !!dropTarget &&
            dropTarget.id === TOP_LEVEL_DROP_ID &&
            dropTarget.type === this.gridTypeFor(gridModel)
        );
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
        this.renameGroupDialogModel = new RenameGroupDialogModel(this);

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
        try {
            await viewManagerModel.updateViewsInfoAsync(views, update);
        } finally {
            // Refresh even on failure - bulk updates apply per-view and can partially succeed.
            await viewManagerModel.refreshAsync();
            await this.refreshAsync();
        }
        // No reselect -- views may have moved between tabs.
    }

    private async doRenameGroupAsync(from: string, to: string, isGlobal: boolean) {
        await this.applyGroupRenameAsync(from, to, isGlobal);
        await this.viewManagerModel.refreshAsync();
        await this.refreshAsync();
        await this.reselectGroupAsync(to, isGlobal);
    }

    /**
     * Rename/re-parent a group by rewriting the group of an anchor view beneath it, with a
     * server-side `groupRename` cascade covering all other views under the group. The cascade
     * excludes the anchor view itself, so its own rewritten group is set in the same update.
     */
    private async applyGroupRenameAsync(from: string, to: string, isGlobal: boolean) {
        const {viewManagerModel} = this,
            views = isGlobal ? viewManagerModel.globalViews : viewManagerModel.ownedViews,
            anchor = views.find(v => isGroupSameOrDescendant(v.group, from));
        if (!anchor) return;

        await viewManagerModel.updateViewInfoAsync(anchor, {
            group: to + anchor.group.substring(from.length),
            groupRename: {from, to}
        });
    }

    /**
     * Group row ids incorporate the group's path, so a renamed/moved group returns from refresh
     * as a new record - collapsed and unselected. Re-expand and reselect it.
     */
    private async reselectGroupAsync(path: string, isGlobal: boolean) {
        const gridModel = isGlobal ? this.globalGridModel : this.ownedGridModel;
        gridModel.expandAll();
        await gridModel.selectAsync(`group:${path}`);
    }

    //------------------------
    // Drag and drop
    //------------------------
    private gridTypeFor(gridModel: GridModel): GridType {
        return gridModel === this.globalGridModel
            ? 'global'
            : gridModel === this.sharedGridModel
              ? 'shared'
              : 'owned';
    }

    private gridModelFor(type: GridType): GridModel {
        switch (type) {
            case 'global':
                return this.globalGridModel;
            case 'shared':
                return this.sharedGridModel;
            default:
                return this.ownedGridModel;
        }
    }

    private dragDropEnabled(type: GridType): boolean {
        return type === 'owned' || (type === 'global' && this.viewManagerModel.manageGlobal);
    }

    private onRowDragMove(type: GridType, e: any) {
        const payload = this.getDragPayload(e),
            target = this.resolveDropTarget(e);
        this.setDropTarget(type, this.isValidDrop(payload, target) ? target : null);
    }

    private onRowDragEnd(type: GridType, e: any) {
        this.disarmOutsideDrop();

        const payload = this.getDragPayload(e),
            target = this.resolveDropTarget(e),
            valid = this.isValidDrop(payload, target);

        this.setDropTarget(type, null);
        if (!valid) return;
        this.doRowDragDropAsync(type, payload, target).catchDefault();
    }

    /**
     * Dragging out past the top of the grid targets the top level, symmetric with the empty
     * space below the last row - arm a one-shot drop completing on release outside the grid
     * (ag-Grid fires no end event out there). Any other exit simply clears the pending target,
     * and re-entering the grid disarms.
     */
    private onRowDragLeave(type: GridType, e: any) {
        const payload = this.getDragPayload(e),
            target: DropTarget = {id: TOP_LEVEL_DROP_ID, path: null};

        if (this.didExitGridTop(type, e) && this.isValidDrop(payload, target)) {
            this.setDropTarget(type, target);
            this.armOutsideDrop(type, payload, target);
        } else {
            this.setDropTarget(type, null);
        }
    }

    /** True if the drag left the grid past its top edge. */
    private didExitGridTop(type: GridType, e: any): boolean {
        const clientY = e.event?.clientY,
            gridId = this.gridModelFor(type)?.agApi?.getGridId(),
            gridEl = gridId
                ? document.querySelector(`.ag-root-wrapper[grid-id="${gridId}"]`)
                : null;
        return gridEl != null && clientY != null && clientY <= gridEl.getBoundingClientRect().top;
    }

    private armOutsideDrop(
        type: GridType,
        payload: {group?: string; views?: ViewInfo[]},
        target: DropTarget
    ) {
        this.disarmOutsideDrop();
        const onMouseUp = () => {
            this.disarmOutsideDrop();
            this.setDropTarget(type, null);
            this.doRowDragDropAsync(type, payload, target).catchDefault();
        };
        // ag-Grid does not observe Escape while the drag is outside the grid - cancel here.
        const onKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') {
                this.disarmOutsideDrop();
                this.setDropTarget(type, null);
            }
        };
        document.addEventListener('mouseup', onMouseUp, {capture: true});
        document.addEventListener('keydown', onKeyDown, {capture: true});
        this.outsideDropCleanup = () => {
            document.removeEventListener('mouseup', onMouseUp, {capture: true});
            document.removeEventListener('keydown', onKeyDown, {capture: true});
            this.outsideDropCleanup = null;
        };
    }

    private disarmOutsideDrop() {
        this.outsideDropCleanup?.();
    }

    private async doRowDragDropAsync(
        type: GridType,
        payload: {group?: string; views?: ViewInfo[]},
        target: DropTarget
    ) {
        const isGlobal = type === 'global',
            {group, views} = payload;

        if (!(await this.confirmGlobalDropAsync(payload, isGlobal))) return;

        return group != null
            ? this.dropMoveGroupAsync(group, target.path, isGlobal).linkTo(this.updateTask)
            : this.dropMoveViewsAsync(views, target.path).linkTo(this.updateTask);
    }

    /**
     * Confirm before a drop that moves any global view - such moves re-group the view within
     * every user's menu, not just the current user's.
     */
    private async confirmGlobalDropAsync(
        payload: {group?: string; views?: ViewInfo[]},
        isGlobal: boolean
    ): Promise<boolean> {
        const {viewManagerModel} = this,
            {globalDisplayName, typeDisplayName} = viewManagerModel,
            affected =
                payload.group != null
                    ? (isGlobal
                          ? viewManagerModel.globalViews
                          : viewManagerModel.ownedViews
                      ).filter(v => isGroupSameOrDescendant(v.group, payload.group))
                    : payload.views,
            globalViews = affected.filter(v => v.isGlobal);

        if (!globalViews.length) return true;

        const countStr = pluralize(
            `${globalDisplayName} ${typeDisplayName}`,
            globalViews.length,
            true
        );
        return XH.confirm({
            message: fragment(
                p(`This will move ${countStr} for all other ${XH.appName} users.`),
                p(strong('Are you sure you want to proceed?'))
            ),
            confirmProps: {
                text: 'Yes, move',
                outlined: true,
                autoFocus: false,
                intent: 'primary'
            }
        });
    }

    /**
     * Dragged payload - a single group path when the drag originates on a group row (any other
     * selected rows are ignored - groups move one at a time), else the deduped views across all
     * dragged leaf rows.
     */
    private getDragPayload(e: any): {group?: string; views?: ViewInfo[]} {
        const origin = e.node?.data as StoreRecord;
        if (origin?.data.isGroupRow) return {group: origin.data.group};

        const nodes: any[] = e.nodes ?? [e.node],
            views = nodes
                .map(n => n?.data as StoreRecord)
                .filter(rec => rec && !rec.data.isGroupRow)
                .map(rec => rec.data.view as ViewInfo);
        return {views: uniqBy(compact(views), 'token')};
    }

    /**
     * Group targeted by the hover - a hovered group row targets itself, a hovered leaf row its
     * parent group, and empty space (or a top-level leaf) the top level, outside all groups.
     */
    private resolveDropTarget(e: any): DropTarget {
        const over = e.overNode?.data as StoreRecord;
        if (!over) return {id: TOP_LEVEL_DROP_ID, path: null};
        if (over.data.isGroupRow) return {id: over.id as string, path: over.data.group};

        const parent = e.overNode.parent?.data as StoreRecord;
        return parent
            ? {id: parent.id as string, path: parent.data.group}
            : {id: TOP_LEVEL_DROP_ID, path: null};
    }

    private isValidDrop(payload: {group?: string; views?: ViewInfo[]}, target: DropTarget) {
        if (!target) return false;
        const {group, views} = payload,
            targetPath = target.path;

        if (group != null) {
            // No dropping a group into itself or its own subtree, and no no-op moves.
            if (isGroupSameOrDescendant(targetPath, group)) return false;
            return composeGroupPath(targetPath, getGroupLeaf(group)) !== group;
        }

        // At least one view must actually move.
        return views.some(v => (v.group ?? null) !== (targetPath ?? null));
    }

    @action
    private setDropTarget(type: GridType, target: DropTarget) {
        const prev = this.dropTarget,
            next = target ? {type, id: target.id} : null;
        if (isEqual(prev, next)) return;
        this.dropTarget = next;

        // Redraw only the affected rows, so the drop-target rowClassRule re-evaluates.
        const gridModel = this.gridModelFor(type),
            agApi = gridModel?.agApi;
        if (!agApi) return;
        const rowNodes = compact(
            [prev, next].map(t => {
                if (!t || t.type !== type || t.id === TOP_LEVEL_DROP_ID) return null;
                const rec = gridModel.store.getById(t.id);
                return rec ? agApi.getRowNode(rec.agId) : null;
            })
        );
        if (rowNodes.length) agApi.redrawRows({rowNodes});
    }

    /** Drop-driven flat move of views into a group (or the top level). */
    private async dropMoveViewsAsync(views: ViewInfo[], targetPath: string) {
        const {viewManagerModel} = this,
            countStr = pluralize(viewManagerModel.typeDisplayName, views.length, true),
            destStr = targetPath ? `"${getGroupLeaf(targetPath)}"` : 'the top level';
        try {
            await viewManagerModel.updateViewsInfoAsync(views, {group: targetPath});
            XH.successToast({message: `Moved ${countStr} to ${destStr}.`, position: 'top'});
        } catch (e) {
            XH.handleException(e, {showAlert: false});
            XH.dangerToast({
                message: `Unable to move ${countStr} to ${destStr}.`,
                position: 'top'
            });
        } finally {
            // Refresh even on failure - bulk updates apply per-view and can partially succeed.
            await viewManagerModel.refreshAsync();
            await this.refreshAsync();
        }
    }

    /** Drop-driven re-parenting of a group and its full subtree. */
    private async dropMoveGroupAsync(from: string, targetPath: string, isGlobal: boolean) {
        const leaf = getGroupLeaf(from),
            to = composeGroupPath(targetPath, leaf),
            destStr = targetPath ? `"${getGroupLeaf(targetPath)}"` : 'the top level';
        let moved = false;
        try {
            await this.applyGroupRenameAsync(from, to, isGlobal);
            moved = true;
            XH.successToast({message: `Moved group "${leaf}" to ${destStr}.`, position: 'top'});
        } catch (e) {
            XH.handleException(e, {showAlert: false});
            XH.dangerToast({
                message: `Unable to move group "${leaf}" to ${destStr}.`,
                position: 'top'
            });
        } finally {
            await this.viewManagerModel.refreshAsync();
            await this.refreshAsync();
        }
        if (moved) await this.reselectGroupAsync(to, isGlobal);
    }

    private async doDeleteAsync(views: ViewInfo[], groupName?: string) {
        const {viewManagerModel} = this,
            {typeDisplayName} = viewManagerModel,
            count = views.length;

        if (!count) return;

        const confirmStr = groupName
            ? `group "${groupName}" and its ${count} nested ${pluralize(typeDisplayName, count)}`
            : count > 1
              ? pluralize(typeDisplayName, count, true)
              : views[0].typedName;
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
                text: 'Yes, delete',
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
                    // Prefix group row ids by owner at every depth - the same group path can
                    // exist under multiple owners, and store record ids must be unique.
                    children: this.buildTreeData(viewsByOwner[owner]).map(child =>
                        this.applyIdPrefix(child, `owner:${owner}|`)
                    )
                }));
        }

        const {roots, ungrouped} = buildViewGroupTree(views);
        return [
            ...roots.map(node => this.groupNodeToTreeData(node)),
            ...ungrouped.map(view => this.viewToTreeData(view))
        ];
    }

    private applyIdPrefix(treeData: PlainObject, idPrefix: string): PlainObject {
        if (!treeData.isGroupRow) return treeData;
        return {
            ...treeData,
            id: `${idPrefix}${treeData.id}`,
            children: treeData.children.map(child => this.applyIdPrefix(child, idPrefix))
        };
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

    /** True if the record is a group row whose views can all be edited by the current user. */
    private canRenameGroupRecord(record: StoreRecord): boolean {
        if (!record?.data.isGroupRow || record.data.group == null) return false;
        const views = compact(record.descendants.map(r => r.data.view as ViewInfo));
        return !!views.length && views.every(v => v.isEditable);
    }

    /** Select the group row - binding the shared group form to it - then open the dialog. */
    private async startRenameGroupAsync(record: StoreRecord, gridModel: GridModel) {
        await gridModel.selectAsync(record);
        this.renameGroupDialogModel.isRenameDialogOpen = true;
    }

    private createGridModel(type: 'owned' | 'global' | 'shared'): GridModel {
        const {typeDisplayName, globalDisplayName} = this.viewManagerModel;

        const renameGroupAction: RecordActionSpec = {
            text: 'Rename Group',
            icon: Icon.edit(),
            displayFn: ({record}) => ({hidden: !this.canRenameGroupRecord(record)}),
            actionFn: ({record, gridModel}) => {
                this.startRenameGroupAsync(record, gridModel).catchDefault();
            }
        };

        const contextMenu =
            type === 'shared' ? ['expandCollapseAll'] : [renameGroupAction, 'expandCollapseAll'];

        const modifier =
            type == 'owned' ? `personal` : type == 'global' ? globalDisplayName : 'shared';

        return new GridModel({
            emptyText: `No ${modifier} ${pluralize(typeDisplayName)} found...`,
            // Sort groups above loose views among siblings, then alpha by name.
            sortBy: ['isGroupRow|desc', 'name'],
            treeMode: true,
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            rowBorders: true,
            selModel: 'multiple',
            contextMenu,
            sizingMode: 'standard',
            hideHeaders: true,
            rowClassRules: {
                'xh-grid-clear-background-color': ({data}) => data && !data.data.isGroupRow,
                // Highlight the row of the pending drop-target group.
                'xh-view-manager__drop-target': ({data}) =>
                    data && this.dropTarget?.type === type && this.dropTarget.id === data.id
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
                {
                    colId: 'dragHandle',
                    headerName: null,
                    width: 28,
                    resizable: false,
                    align: 'center',
                    omit: !this.dragDropEnabled(type),
                    agOptions: {rowDrag: true}
                },
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
