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
    getAllGroupPaths,
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
import {GridOptions, RowDropZoneEvents} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, compact, every, groupBy, isEqual, keys, some, startCase, uniqBy} from 'lodash';
import {ReactNode} from 'react';
import {groupPathBreadcrumb} from './GroupPathBreadcrumb';
import {topLevelLabel} from './Utils';
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

/** The top-level strip's drop target - always the sentinel id, outside all groups. */
const TOP_LEVEL_TARGET: DropTarget = {id: TOP_LEVEL_DROP_ID, path: null};

/** Dragged/selected payload - a single group path, or a deduped set of views. */
interface DragPayload {
    group?: string;
    views?: ViewInfo[];
}

/** Display mode for the top-level drop strip within one grid's pane. */
type StripMode = 'rest' | 'armed' | 'hot' | 'blocked';

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

    /**
     * Row(s)/group currently mid-drag, tagged by originating grid - drives the top-level strip's
     * armed/hot/blocked display. Cleared on every drag-ending gesture, wherever it ends.
     */
    @observable.ref private drag: {type: GridType; payload: DragPayload} = null;

    /** Reversing action for the most recently applied move, backing the toast's Undo button. */
    private lastMove: {undo: () => Promise<void>} = null;
    private lastMoveTimer: ReturnType<typeof setTimeout> = null;

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
        this.drag = null;
        this.dropTarget = null;
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
     * Drops move the dragged views/group immediately - no save step, applied optimistically with
     * a toast + Undo rather than a confirm. Empty on grids that do not support drag-and-drop.
     * Requires ag-Grid's `RowDragModule` to be registered.
     */
    getRowDragAgOptions(gridModel: GridModel): GridOptions {
        const type = this.gridTypeFor(gridModel);
        if (!this.supportsDragDrop(gridModel)) return {};

        const {typeDisplayName} = this.viewManagerModel;
        return {
            // Sticky group rows overlay the top of the grid while scrolled, where they capture
            // hovers/drops not intended for them - confusing during drag-and-drop.
            suppressGroupRowsSticky: true,
            rowDragMultiRow: true,
            rowDragText: (params, dragItemCount) => {
                const rec = params.rowNode?.data as StoreRecord;
                if (rec?.data.isGroupRow) return `Group "${rec.data.name}"`;
                return dragItemCount === 1
                    ? `${capitalize(typeDisplayName)} "${rec?.data.name}"`
                    : pluralize(typeDisplayName, dragItemCount, true);
            },
            onRowDragEnter: e => this.onRowDragEnter(type, e),
            onRowDragMove: e => this.onRowDragMove(type, e),
            onRowDragLeave: () => this.setDropTarget(type, null),
            onRowDragEnd: e => this.onRowDragEnd(type, e),
            // Generic (not row-drag-specific) events that fire for every drag-ending gesture,
            // regardless of where it ends - the only reliable place to clear pending state for a
            // release outside any drop target (grid body, top-level strip, or elsewhere), which
            // otherwise triggers no row-drag event at all. Replaces the old manual Escape/outside
            // -release handling, both now covered by ag-Grid's own global drag lifecycle.
            onDragStopped: () => this.onDragGestureEnded(type),
            onDragCancelled: () => this.onDragGestureEnded(type)
        };
    }

    /** True if `gridModel`'s pane supports drag-and-drop, and therefore the top-level strip. */
    supportsDragDrop(gridModel: GridModel): boolean {
        return this.dragDropEnabled(this.gridTypeFor(gridModel));
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

    /**
     * True when the grid's current selection cannot be dragged - a group row can only move on
     * its own, so any selection combining a group with other rows (more groups or views)
     * disables drag-and-drop across the grid.
     */
    isDragDisabled(gridModel: GridModel): boolean {
        const recs = gridModel.selectedRecords;
        return recs.length > 1 && recs.some(r => r.data.isGroupRow);
    }

    /**
     * Display state for `gridModel`'s top-level drop strip - rest/armed/hot/blocked, matching
     * the in-flight drag (if it originated in this grid) or, at rest, the current selection.
     */
    stripState(gridModel: GridModel): {mode: StripMode; hint: string} {
        const type = this.gridTypeFor(gridModel),
            payload = this.drag?.type === type ? this.drag.payload : null;

        if (!payload) {
            const hasSelection = gridModel.hasSelection && !this.isDragDisabled(gridModel);
            return {
                mode: 'rest',
                hint: hasSelection ? 'Click to move the selection to the top level' : ''
            };
        }

        const name = this.dragPayloadName(payload);
        if (!this.isValidDrop(payload, TOP_LEVEL_TARGET)) {
            return {mode: 'blocked', hint: `${name} is already at top level`};
        }
        return this.isTopLevelDropTarget(gridModel)
            ? {mode: 'hot', hint: `Release to move ${name}`}
            : {mode: 'armed', hint: 'Drop here to move out of all groups'};
    }

    /**
     * ag-Grid `RowDropZoneEvents` for the top-level strip within one grid's pane - registered by
     * the strip component as an external drop zone via `gridModel.agApi.addRowDropZone()`. The
     * strip's target is always the top level, regardless of where the pointer sits within it, so
     * unlike the in-grid handlers above there is no need to track a continuously-updating target.
     */
    getTopLevelDropZoneEvents(gridModel: GridModel): RowDropZoneEvents {
        const type = this.gridTypeFor(gridModel);
        return {
            onDragEnter: () => this.setDropTarget(type, TOP_LEVEL_TARGET),
            onDragLeave: () => this.setDropTarget(type, null),
            onDragStop: () => {
                const payload = this.drag?.type === type ? this.drag.payload : null;
                if (payload && this.isValidDrop(payload, TOP_LEVEL_TARGET)) {
                    this.doRowDragDropAsync(type, payload, TOP_LEVEL_TARGET).catchDefault();
                }
            }
        };
    }

    /**
     * Click-to-move path for the top-level strip - moves the grid's current selection to the top
     * level via the same code path as a drop, covering keyboard/trackpad users and long lists
     * where dragging from a deep row would require an auto-scrolling drag. No-op without a
     * (draggable) selection, or if the selection is already at the top level.
     */
    async moveSelectionToTopLevelAsync(gridModel: GridModel): Promise<void> {
        const type = this.gridTypeFor(gridModel),
            payload = this.getSelectionPayload(gridModel);
        if (!payload || !this.isValidDrop(payload, TOP_LEVEL_TARGET)) return;
        return this.doRowDragDropAsync(type, payload, TOP_LEVEL_TARGET);
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
        await this.viewManagerModel.renameGroupAsync(from, to, isGlobal);
        await this.viewManagerModel.refreshAsync();
        await this.refreshAsync();
        await this.reselectGroupAsync(to, isGlobal);
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

    private onRowDragEnter(type: GridType, e: any) {
        if (this.isDragDisabled(this.gridModelFor(type))) return;
        this.drag = {type, payload: this.getDragPayload(e)};
    }

    private onRowDragMove(type: GridType, e: any) {
        if (this.isDragDisabled(this.gridModelFor(type))) return;

        const payload = this.getDragPayload(e),
            target = this.resolveDropTarget(e);
        this.setDropTarget(type, this.isValidDrop(payload, target) ? target : null);
    }

    private onRowDragEnd(type: GridType, e: any) {
        if (this.isDragDisabled(this.gridModelFor(type))) return;

        const payload = this.getDragPayload(e),
            target = this.resolveDropTarget(e);
        if (!this.isValidDrop(payload, target)) return;
        this.doRowDragDropAsync(type, payload, target).catchDefault();
    }

    /**
     * Clears any pending drag/drop-target state for `type`'s grid - fires on every gesture that
     * ends a drag (a completed drop wherever it landed, an Escape cancel, or a release outside
     * any registered drop target), via the generic `dragStopped`/`dragCancelled` grid events
     * rather than the row-drag-specific ones, since those alone never fire for a release outside
     * every target.
     */
    private onDragGestureEnded(type: GridType) {
        if (this.drag?.type === type) this.drag = null;
        this.setDropTarget(type, null);
    }

    private doRowDragDropAsync(type: GridType, payload: DragPayload, target: DropTarget) {
        const isGlobal = type === 'global',
            {group, views} = payload;
        return group != null
            ? this.dropMoveGroupAsync(group, target.path, isGlobal).linkTo(this.updateTask)
            : this.dropMoveViewsAsync(views, target.path).linkTo(this.updateTask);
    }

    /**
     * Dragged payload - a single group path when the drag originates on a group row (any other
     * selected rows are ignored - groups move one at a time), else the deduped views across all
     * dragged leaf rows.
     */
    private getDragPayload(e: any): DragPayload {
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
     * Selection-driven payload for the top-level strip's click-to-move path, mirroring the rules
     * that gate a drag: null when there is no selection, or when it mixes a group row with any
     * other row (per {@link isDragDisabled}); a lone selected group row moves as a group; any
     * other selection moves its (group-expanded) views as a flat batch.
     */
    private getSelectionPayload(gridModel: GridModel): DragPayload {
        const recs = gridModel.selectedRecords;
        if (!recs.length || this.isDragDisabled(gridModel)) return null;

        if (recs.length === 1 && recs[0].data.isGroupRow) return {group: recs[0].data.group};

        const views = recs.flatMap(r =>
            r.data.isGroupRow ? r.descendants.map(d => d.data.view) : [r.data.view]
        );
        return {views: uniqBy(compact(views), 'token')};
    }

    /** Quoted/pluralized display name for a drag/selection payload, for the strip's hint text. */
    private dragPayloadName(payload: DragPayload): string {
        const {group, views} = payload;
        if (group != null) return `"${getGroupLeaf(group)}"`;
        return views.length === 1
            ? `"${views[0].name}"`
            : pluralize(this.viewManagerModel.typeDisplayName, views.length, true);
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

    private isValidDrop(payload: DragPayload, target: DropTarget) {
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

    /**
     * Drop-driven flat move of views into a group (or the top level). Applied immediately, with
     * a toast + Undo rather than a confirm - reorganizing views (especially globals, shared
     * across every user's menu) is often a rapid multi-drop task, and a confirm on every drop
     * trains people to click straight through the one that matters.
     */
    private async dropMoveViewsAsync(views: ViewInfo[], targetPath: string) {
        const {viewManagerModel} = this,
            {typeDisplayName} = viewManagerModel,
            countStr = pluralize(typeDisplayName, views.length, true),
            dest = this.groupDisplay(targetPath),
            prevGroups = new Map(views.map(v => [v, v.group ?? null]));
        try {
            await viewManagerModel.updateViewsInfoAsync(views, {group: targetPath});
            const message =
                views.length === 1
                    ? fragment(
                          `${capitalize(typeDisplayName)} "${views[0].name}" moved to `,
                          dest,
                          '.'
                      )
                    : fragment(`Moved ${countStr} to `, dest, '.');
            this.showMoveToast(message, () => this.restoreViewGroupsAsync(prevGroups));
        } catch (e) {
            XH.handleException(e, {showAlert: false});
            XH.dangerToast({
                message: fragment(`Unable to move ${countStr} to `, dest, '.'),
                position: 'top'
            });
        } finally {
            // Refresh even on failure - bulk updates apply per-view and can partially succeed.
            await viewManagerModel.refreshAsync();
            await this.refreshAsync();
        }
    }

    /** Drop-driven re-parenting of a group and its full subtree - same immediate/toast pattern. */
    private async dropMoveGroupAsync(from: string, targetPath: string, isGlobal: boolean) {
        const leaf = getGroupLeaf(from),
            to = composeGroupPath(targetPath, leaf),
            dest = this.groupDisplay(targetPath);
        let moved = false;
        try {
            await this.viewManagerModel.renameGroupAsync(from, to, isGlobal);
            moved = true;
            const message = fragment(
                'Group ',
                groupPathBreadcrumb({path: from}),
                ' moved to ',
                dest,
                '.'
            );
            this.showMoveToast(message, async () => {
                await this.viewManagerModel.renameGroupAsync(to, from, isGlobal);
                await this.viewManagerModel.refreshAsync();
                await this.refreshAsync();
                await this.reselectGroupAsync(from, isGlobal);
            });
        } catch (e) {
            XH.handleException(e, {showAlert: false});
            XH.dangerToast({
                message: fragment(
                    'Unable to move group ',
                    groupPathBreadcrumb({path: from}),
                    ' to ',
                    dest,
                    '.'
                ),
                position: 'top'
            });
        } finally {
            await this.viewManagerModel.refreshAsync();
            await this.refreshAsync();
        }
        if (moved) await this.reselectGroupAsync(to, isGlobal);
    }

    /**
     * Show a success toast for an applied move, with an Undo action reversing it. Only the most
     * recently shown move can be undone - a new move clears any prior one still pending.
     */
    private showMoveToast(message: ReactNode, undo: () => Promise<void>) {
        clearTimeout(this.lastMoveTimer);
        this.lastMove = {undo};
        this.lastMoveTimer = setTimeout(() => (this.lastMove = null), 5000);
        XH.successToast({
            message,
            position: 'top',
            timeout: 5000,
            actionButtonProps: {text: 'Undo', onClick: () => this.undoLastMoveAsync()}
        });
    }

    private async undoLastMoveAsync() {
        const move = this.lastMove;
        if (!move) return;
        this.lastMove = null;
        clearTimeout(this.lastMoveTimer);
        try {
            await move.undo();
        } catch (e) {
            XH.handleException(e, {showAlert: false});
            XH.dangerToast({message: 'Unable to undo the move.', position: 'top'});
        }
    }

    /**
     * Restore each view's previous group from a snapshot taken before a flat move, batched by
     * distinct prior group so views that came from different groups (a multi-select drop/click)
     * each land back where they started.
     */
    private async restoreViewGroupsAsync(prevGroups: Map<ViewInfo, string>) {
        const {viewManagerModel} = this,
            entries = Array.from(prevGroups, ([view, group]) => ({view, group})),
            byGroup = groupBy(entries, entry => entry.group ?? '');

        for (const key in byGroup) {
            await viewManagerModel.updateViewsInfoAsync(
                byGroup[key].map(({view}) => view),
                {
                    group: key || null
                }
            );
        }
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    private async doDeleteAsync(views: ViewInfo[], groupName?: string) {
        const {viewManagerModel} = this,
            {typeDisplayName} = viewManagerModel,
            count = views.length;

        if (!count) return;

        const confirmStr: ReactNode = groupName
            ? fragment(
                  'group ',
                  groupPathBreadcrumb({path: groupName}),
                  ` and its ${count} nested ${pluralize(typeDisplayName, count)}`
              )
            : count > 1
              ? pluralize(typeDisplayName, count, true)
              : views[0].typedName;
        const msgs: ReactNode[] = [fragment('Are you sure you want to delete ', confirmStr, '?')];
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

        // Groups are derived from the paths on their views, so deleting the last view in one
        // takes the group with it - a consequence worth naming as it happens.
        const isGlobalScope = views[0].isGlobal,
            groupsBefore = this.scopedGroupPaths(isGlobalScope);
        try {
            await viewManagerModel.deleteViewsAsync(views);
            this.showDeleteToast(count, groupsBefore, isGlobalScope);
        } finally {
            await this.refreshAsync();
        }
    }

    /** Confirm the delete, naming any groups that ceased to exist along with their last views. */
    private showDeleteToast(count: number, groupsBefore: string[], isGlobal: boolean) {
        const {typeDisplayName} = this.viewManagerModel,
            deleted = `Deleted ${pluralize(typeDisplayName, count, true)}.`,
            remaining = new Set(this.scopedGroupPaths(isGlobal)),
            removed = groupsBefore.filter(path => !remaining.has(path)),
            noneRemain = ` removed — no ${pluralize(typeDisplayName)} remain.`;

        let message: ReactNode = deleted;
        if (removed.length === 1) {
            message = fragment(
                `${deleted} Group `,
                groupPathBreadcrumb({path: removed[0]}),
                noneRemain
            );
        } else if (removed.length > 1) {
            message = `${deleted} ${removed.length} groups${noneRemain}`;
        }

        XH.successToast({message, position: 'top'});
    }

    /** All group paths within the global or owned views, which namespace their groups separately. */
    private scopedGroupPaths(isGlobal: boolean): string[] {
        const {viewManagerModel: vmm} = this;
        return getAllGroupPaths(isGlobal ? vmm.globalViews : vmm.ownedViews);
    }

    /** A group path for display within a message - breadcrumb, or the top-level label. */
    private groupDisplay(path: string): ReactNode {
        return path ? groupPathBreadcrumb({path}) : topLevelLabel();
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
                        helpIcon: Icon.user(),
                        helpText: fragment(
                            `This tab shows ${views} you have created.`,
                            br(),
                            `Pin ${views} to your menu for quick access.`,
                            br(),
                            `Use groups to nest them under unlimited depth sub-menus.`,
                            br(),
                            `Groups exist as long as they contain ${views}. Create one by assigning a ${view} to it.`,
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
                    helpIcon: Icon.globe(),
                    helpText: fragment(
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
                    helpIcon: Icon.users(),
                    helpText: fragment(
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
