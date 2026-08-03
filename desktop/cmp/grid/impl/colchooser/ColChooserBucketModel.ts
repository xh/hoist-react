/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import {hbox, span} from '@xh/hoist/cmp/layout';
import type {HSide, Some} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import type {
    GridOptions,
    IsRowValidDropPositionParams,
    IsRowValidDropPositionResult,
    RowDragEndEvent,
    RowDropTargetPosition
} from '@xh/hoist/kit/ag-grid';
import {castArray, isEmpty} from 'lodash';
import type {ReactNode} from 'react';

import type {ColChooserModel} from './ColChooserModel';
import {
    resolveDrop as resolveDropEngine,
    isNoOpDrop as isNoOpDropEngine,
    isValidDragSelection,
    dragSelectionRejectReason,
    collapseSelection,
    type DragSelectionRow
} from './colChooserDropEngine';
import {
    chooserDragAgOptions,
    chooserDragText,
    chooserGridConfig,
    chooserNameColumn,
    dragRejectHint,
    type ColChooserData,
    type ColChooserDropParticipant,
    type DragHintReason,
    getChooserData
} from './ColChooserUtils';

export interface ColChooserBucketConfig {
    parent: ColChooserModel;
    pinned: HSide | null;
    /** Label shown in the bucket's compact Panel header. */
    title: string;
    emptyText: string;
}

/**
 * Per-bucket model backing a single chooser grid (pinned-left, unpinned, or pinned-right). Owns its
 * slice of the target grid's columnState; the parent {@link ColChooserModel} supplies the target
 * GridModel and the state commit chokepoint.
 * @internal
 */
export class ColChooserBucketModel extends HoistModel implements ColChooserDropParticipant {
    override xhImpl = true;

    readonly parent: ColChooserModel;
    readonly pinned: HSide | null;
    readonly title: string;

    @managed
    chooserGridModel: GridModel;

    /** True while a cross-bucket drag is hovering this bucket - drives the empty-strip highlight. */
    @bindable
    dragOver: boolean = false;

    /** The target GridModel whose columns this bucket manages. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            ...chooserDragAgOptions,
            suppressGroupRowsSticky: true,
            suppressColumnMoveAnimation: true,
            rowDragText: (dragItem, count) =>
                chooserDragText(this.parent.dragHint, dragItem, count),
            isRowValidDropPosition: params => this.getValidDropPosition(params),
            onRowDragEnd: event => this.handleRowDragEnd(event),
            onCellDoubleClicked: event => {
                // Only toggle from the name column, and not from the tree expand/collapse caret
                if (event.column?.getColId() !== 'name') return;
                const target = event.event?.target as HTMLElement;
                if (target?.closest('.ag-group-expanded, .ag-group-contracted')) return;

                const id = event.data?.data?.id;
                if (id) this.toggleVisibility(id);
            }
        };
    }

    /** True when this bucket holds any column the header toggle can show/hide. */
    @computed
    get hasHideableColumns(): boolean {
        return !isEmpty(this.hideableLeaves);
    }

    /**
     * Count of this bucket's leaf columns as actually rendered, so a rail whose columns are all
     * filtered out or routed to the Library reads as empty, like a genuinely empty one.
     */
    @computed
    get columnCount(): number {
        return this.renderedLeafIds.size;
    }

    /** Bucket-scoped aggregate visibility over hideable leaves: true (all) / false (none) / null (mixed). */
    @computed
    get aggregateVisible(): boolean | null {
        const leaves = this.hideableLeaves;
        return aggregateVisibility(leaves.length, leaves.filter(cs => cs.hidden).length);
    }

    constructor({parent, pinned, title, emptyText}: ColChooserBucketConfig) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.pinned = pinned;
        this.title = title;

        this.chooserGridModel = this.createGridModel(emptyText);
    }

    /** Show or hide all hideable columns in this bucket (backs the header "toggle all" control). */
    toggleBucketVisibility() {
        const {targetGridModel: gridModel} = this,
            leaves = this.hideableLeaves;
        if (isEmpty(leaves)) return;

        // Hide when fully or partially visible (true/null); show when fully hidden (false).
        const hidden = this.aggregateVisible !== false,
            updates: Partial<ColumnState>[] = [];
        leaves.forEach(cs => {
            // Never hide a leaf that isn't hideable; showing one is a harmless no-op.
            if (hidden && !gridModel.isColumnHideable(cs.colId)) return;
            updates.push({colId: cs.colId, hidden});
        });
        this.parent.updateColumns(updates);
    }

    /**
     * Rebuild this bucket's chooser records from the given (full) columnState. With `showHidden` false,
     * hidden columns are dropped from the display entirely - they live in the Column Library instead.
     */
    syncFromState(columnState: ColumnState[], showGroups: boolean, showHidden: boolean) {
        let slice = columnState.filter(cs => (cs.pinned ?? null) === this.pinned);
        if (!showHidden) slice = slice.filter(cs => !cs.hidden);
        this.loadData(this.buildData(slice), showGroups);
    }

    /**
     * Force ag-grid to re-render the per-row action cells - their `displayFn` reads the observable
     * library-shown state, but ag-grid-mounted cells don't reliably repaint on that change.
     */
    refreshActionColumn() {
        this.chooserGridModel.agApi?.refreshCells({columns: [actionCol.colId], force: true});
    }

    toggleVisibility(recordIds: Some<StoreRecordId>) {
        const {targetGridModel: gridModel} = this,
            {store} = this.chooserGridModel,
            rendered = this.renderedLeafIds,
            updates: Partial<ColumnState>[] = [];

        castArray(recordIds).forEach(id => {
            const record = store.getById(id);
            if (!record || isVisibilityLocked(record.data as ColChooserData)) return;

            const hidden = record.data.visible !== false;
            record.data.leafColIds.forEach((colId: string) => {
                // Only act on leaves rendered in this bucket - a group toggle under an active filter
                // must not flip the visibility of columns the user can't currently see.
                if (!rendered.has(colId)) return;
                // A group's aggregate hideable can be true while it contains a locked leaf - never
                // hide such a leaf. Showing it is a no-op (a non-hideable column stays visible).
                if (hidden && !gridModel.isColumnHideable(colId)) return;
                updates.push({colId, hidden});
            });
        });

        this.parent.updateColumns(updates);
    }

    /** Validate a proposed drop position during unmanaged row dragging within this bucket. */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        // Only a successful resolution below re-arms this for the commit.
        this.pendingDrop = null;

        const records = collapseSelection(getDragRecords(params.rows ?? [params.source])),
            selRows = this.buildSelectionRows(records),
            lock = this.targetGridModel.lockColumnGroups;

        if (selRows && !isValidDragSelection(selRows, lock)) {
            this.publishDragHint(dragSelectionRejectReason(selRows, lock));
            return {allowed: false};
        }

        const payload = buildDragPayload(records);
        if (payload && !this.canAccept(payload.leafColIds)) {
            this.publishDragHint('pinningDisabled');
            return {allowed: false};
        }

        // Every refusal past the selection gate is benign (over the dragged row, a no-op), so no hint.
        this.publishDragHint(null);

        let target = params.target,
            {position} = params;

        // No row under the cursor - above the first row or below the last. Anchor to the nearer end via
        // `y` (0 = top of the first row, comparable to rowTop); ag-grid's own `target` walks up to an
        // ancestor group here and misplaces the indicator.
        if (!params.overNode) {
            const {agApi} = this.chooserGridModel,
                firstRow = agApi?.getDisplayedRowAtIndex(0),
                lastRow = this.getLastDisplayedRow();

            if (firstRow && lastRow) {
                const contentMid = (firstRow.rowTop + lastRow.rowTop + lastRow.rowHeight) / 2;
                target = params.y < contentMid ? firstRow : lastRow;
                position = params.y < contentMid ? 'above' : 'below';
            }
        }

        const targetData = getChooserData(target);
        if (!payload || !targetData) return {allowed: false};

        // A row can't be dropped onto one of the dragged rows themselves - except a drop from the
        // Column Library onto the same column's inline (hidden) row, which unhides it in place.
        if (payload.recordIds.has(targetData.id) && !payload.fromLibrary) return {allowed: false};

        if (targetData.isGroup) {
            // Normalize to "before the group" - resolveDrop anchors on the group's run. ag-grid's own
            // before/after read of the cursor half differs between cross-bucket and in-bucket drags.
            position = 'above';
        } else if (position === 'inside') {
            // Can't drop "inside" a leaf - treat as "below"
            position = 'below';
        }

        // Gate on the dragged LEAVES, not every descendant of a dragged group: a spanning group's
        // members in another bucket are valid rejoin targets (C-SPAN).
        if (!payload.fromLibrary && payload.leafColIds.includes(targetData.id)) {
            return {allowed: false};
        }

        // Same engine the commit uses, so the indicator always agrees with what the drop will do.
        // Walking every bucket's records is not free, and ag-grid calls this on each drag-move.
        const displayed = this.parent.displayedLeafColIds,
            {allowed, state} = this.resolveDrop(
                payload.leafColIds,
                payload.dragUnitGroupId,
                targetData,
                position,
                payload.fromLibrary,
                displayed
            );
        if (!allowed || !state) return {allowed: false};

        // A library drop always unhides, so it is never a no-op.
        if (!payload.fromLibrary && this.isNoOpDrop(state, displayed)) {
            return {allowed: false};
        }

        // Cache the state for the commit to apply verbatim - re-resolving from the indicator anchor can
        // diverge when a group spans buckets.
        const highlight = this.getDropHighlight(state, payload.leafColIds);
        this.pendingDrop = {
            targetId: getChooserData(highlight.target)?.id ?? null,
            position: highlight.position,
            state
        };
        return highlight;
    }

    /** Handle intra-bucket drag end. */
    handleRowDragEnd(event: RowDragEndEvent) {
        // Fires on the source grid for every drag, intra- or cross-bucket, so any drag clears the hint.
        this.parent.setDragHint(null);
        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed || dropInfo.position === 'none') return;
        this.applyPendingDrop(dropInfo);
    }

    /**
     * Handle a drop into this bucket from another, via an ag-grid row drop zone. Applies the state
     * {@link getValidDropPosition} already validated for the drag, so the commit matches the preview.
     */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColChooserDropParticipant) {
        if (source === this) return;

        const dropInfo = event.rowsDrop;
        if (dropInfo?.allowed && dropInfo.position !== 'none' && this.applyPendingDrop(dropInfo)) {
            return;
        }

        // No cached preview matched (empty bucket / no row under the cursor) - pin in place instead.
        if (!event.overNode) {
            const records = collapseSelection(getDragRecords(event.nodes));
            if (!this.isValidSelection(records)) return;
            const payload = buildDragPayload(records);
            if (!payload || !this.canAccept(payload.leafColIds)) return;
            const makeVisible = source === this.parent.libraryModel;
            this.moveColumns(
                payload.leafColIds,
                payload.dragUnitGroupId,
                null,
                'below',
                makeVisible
            );
        }
    }

    /**
     * Drag-image icon name for a cross-bucket drag hovering this bucket's grid - injected by
     * ColChooserModel as the drop zone's getIconName, since ag-grid otherwise hardcodes external
     * drop-zone icons to 'move' regardless of `isRowValidDropPosition`.
     */
    getCrossBucketDropIcon(draggingEvent: any): string {
        const dropTarget = draggingEvent?.dropTarget;
        if (dropTarget?.overNode && dropTarget.allowed === false) return 'notAllowed';

        const node = draggingEvent?.dragItem?.rowNode ?? draggingEvent?.dragItem?.rowNodes?.[0],
            sourceData = getChooserData(node);
        if (!sourceData) return 'move';
        if (!this.canAccept(sourceData.leafColIds)) return 'notAllowed';
        return this.pinned ? 'pinned' : 'move';
    }

    //-----------------------
    // Implementation
    //-----------------------
    /**
     * State resolved by the most recent valid {@link getValidDropPosition}, keyed by the (target,
     * position) we returned - i.e. the `event.rowsDrop` the drop handler receives.
     */
    private pendingDrop: {
        targetId: string | null;
        position: RowDropTargetPosition;
        state: ColumnState[];
    } = null;

    /** This bucket's slice of the current column state (columns pinned to this side). */
    @computed
    private get slice(): ColumnState[] {
        return this.parent.currentState.filter(cs => (cs.pinned ?? null) === this.pinned);
    }

    /**
     * Leaf colIds currently rendered in this bucket's grid. Every visibility control scopes to this, so
     * it never counts or toggles a column the user can't see.
     */
    @computed
    private get renderedLeafIds(): Set<string> {
        const ids = new Set<string>();
        this.chooserGridModel.store.records.forEach(rec => {
            if (!rec.data.isGroup) ids.add(rec.id as string);
        });
        return ids;
    }

    /**
     * True if this bucket can take the given leaves. With pinning disabled the rails still render any
     * app-pinned columns for visibility and reorder, but a move across buckets would re-pin them.
     */
    private canAccept(leafColIds: string[]): boolean {
        if (this.parent.columnPinningEnabled) return true;
        const mine = new Set(this.slice.map(cs => cs.colId));
        return leafColIds.every(id => mine.has(id));
    }

    /** Rendered hideable leaf columns - the columns the "toggle all" control acts on. */
    @computed
    private get hideableLeaves(): ColumnState[] {
        const {targetGridModel: gridModel} = this,
            rendered = this.renderedLeafIds;
        return this.slice.filter(cs => {
            const col = gridModel.getColumn(cs.colId);
            return rendered.has(cs.colId) && col && !col.excludeFromChooser && col.hideable;
        });
    }

    /**
     * Apply the state validated for exactly this drop. Returns false if no cached drop matches, leaving
     * the caller to fall back to re-resolving.
     */
    private applyPendingDrop(dropInfo: RowDragEndEvent['rowsDrop']): boolean {
        const pd = this.pendingDrop;
        if (!pd) return false;
        const targetId = getChooserData(dropInfo.target)?.id ?? null;
        if (pd.targetId !== targetId || pd.position !== dropInfo.position) return false;
        this.pendingDrop = null;
        this.parent.applyState(pd.state);
        return true;
    }

    /** Leaf colId → ancestor group chain, shared across buckets by the parent {@link ColChooserModel}. */
    private get parentChainMap(): Map<string, ColumnGroup[]> {
        return this.parent.parentChainMap;
    }

    /**
     * The dragged rows as {@link DragSelectionRow}s, or null when no gate applies - a Library drag
     * unhides rather than reorders, so it is exempt.
     */
    private buildSelectionRows(records: ColChooserData[]): DragSelectionRow[] | null {
        if (records.some(r => r.fromLibrary)) return null;
        return records.map(r => ({
            isGroup: r.isGroup,
            movable: r.movable,
            parentGroupId: r.isGroup
                ? null
                : (this.parentChainMap.get(r.id)?.at(-1)?.groupId ?? null)
        }));
    }

    /** Gate the whole drag by its selected rows - see {@link isValidDragSelection}. */
    private isValidSelection(records: ColChooserData[]): boolean {
        const rows = this.buildSelectionRows(records);
        return !rows || isValidDragSelection(rows, this.targetGridModel.lockColumnGroups);
    }

    /** Publish (or clear) the parent's explanatory drag hint for a refused drop. */
    private publishDragHint(reason: DragHintReason | null) {
        this.parent.setDragHint(reason ? dragRejectHint(reason) : null);
    }

    /**
     * Build chooser records from a slice of columnState, in display order. Adjacent columns sharing a
     * group merge under one group node; non-adjacent ones produce separate group instances (split
     * groups), so a second pass populates `leafColIds` from each instance's actual children.
     */
    private buildData(columnState: ColumnState[]): ColChooserData[] {
        const {targetGridModel: gridModel, parentChainMap} = this,
            stateById = new Map(columnState.map(cs => [cs.colId, cs]));

        // 1) Walk columnState in order, creating leaf and group records
        const data: ColChooserData[] = [],
            groupInstanceCounts = new Map<string, number>(),
            // Group instances open at the walk position - truncating this closes the ones that ended.
            activeGroups: (string | null)[] = [];

        columnState.forEach((state, idx) => {
            const col = gridModel.getColumn(state.colId);
            if (!col || col.excludeFromChooser) return;

            const chain = parentChainMap.get(state.colId) ?? [];

            let sharedDepth = 0;
            for (let d = 0; d < chain.length; d++) {
                if (activeGroups[d] === chain[d].groupId) {
                    sharedDepth = d + 1;
                } else {
                    break;
                }
            }
            activeGroups.length = sharedDepth;

            for (let d = sharedDepth; d < chain.length; d++) {
                const group = chain[d],
                    count = (groupInstanceCounts.get(group.groupId) ?? 0) + 1;
                groupInstanceCounts.set(group.groupId, count);

                const instanceId = count > 1 ? `${group.groupId}_${count}` : group.groupId,
                    parentInstanceId =
                        d > 0 ? getActiveGroupId(chain, d - 1, groupInstanceCounts) : null;

                data.push({
                    id: instanceId,
                    name: typeof group.headerName === 'string' ? group.headerName : group.groupId,
                    description: '',
                    chooserGroup: '',
                    visible: false,
                    muted: false,
                    isGroup: true,
                    hideable: false,
                    movable: true,
                    parentId: parentInstanceId,
                    sortOrder: idx,
                    leafColIds: []
                });

                activeGroups[d] = group.groupId;
            }

            const parentInstanceId =
                chain.length > 0
                    ? getActiveGroupId(chain, chain.length - 1, groupInstanceCounts)
                    : null;

            data.push({
                id: state.colId,
                name: col.chooserName,
                description: col.chooserDescription ?? '',
                chooserGroup: col.chooserGroup ?? '',
                visible: !state.hidden,
                muted: !!state.hidden,
                isGroup: false,
                hideable: col.hideable,
                movable: col.movable,
                parentId: parentInstanceId,
                sortOrder: idx,
                leafColIds: [state.colId]
            });
        });

        // 2) Populate group leafColIds and derive visibility from actual children
        const childrenByParent = new Map<string, ColChooserData[]>();
        data.forEach(it => {
            if (!it.parentId) return;
            const siblings = childrenByParent.get(it.parentId);
            siblings ? siblings.push(it) : childrenByParent.set(it.parentId, [it]);
        });

        data.forEach(it => {
            if (!it.isGroup) return;

            it.leafColIds = collectLeafColIds(it, childrenByParent);

            // Hideable leaves only, else a group whose sole visible member is locked reads as
            // permanently "mixed" and its toggle wedges.
            const hideableLeafIds = it.leafColIds.filter(id => gridModel.isColumnHideable(id)),
                hiddenCount = hideableLeafIds.filter(id => stateById.get(id)?.hidden).length,
                total = hideableLeafIds.length;
            it.visible = aggregateVisibility(total, hiddenCount);
            it.hideable = total > 0;

            // Independent of hideability, so an all-locked (visible) group reads as shown, not dimmed.
            it.muted =
                !isEmpty(it.leafColIds) && it.leafColIds.every(id => stateById.get(id)?.hidden);

            // One movable child is enough - the rest ride along, per ag-Grid's suppressMovable.
            it.movable = it.leafColIds.some(id => gridModel.isColumnMovable(id));
        });

        return data;
    }

    private loadData(data: ColChooserData[], showGroups: boolean) {
        const {store} = this.chooserGridModel,
            leaves = data.filter(r => !r.isGroup),
            leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            store.loadData(leaves);
            return;
        }

        const groups = data.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id))),
            groupIdSet = new Set(groups.map(r => r.id));

        const childrenMap = new Map<string, ColChooserData[]>();
        [...groups, ...leaves].forEach(it => {
            if (it.parentId && groupIdSet.has(it.parentId)) {
                if (!childrenMap.has(it.parentId)) childrenMap.set(it.parentId, []);
                childrenMap.get(it.parentId).push(it);
            }
        });

        const buildNested = (r: ColChooserData): object => {
            const children = childrenMap.get(r.id);
            return children ? {...r, children: children.map(buildNested)} : {...r};
        };

        const rootGroups = groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootLeaves = leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootData = [...rootGroups, ...rootLeaves].map(buildNested);

        store.loadData(rootData);
    }

    /**
     * Adapt this bucket's live state to the pure {@link resolveDropEngine}, which backs both the drag
     * preview and the commit. `dragUnitGroupId` is set only for an explicitly dragged group row.
     */
    private resolveDrop(
        movingLeafColIds: string[],
        dragUnitGroupId: string | null,
        targetData: ColChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false,
        displayed: Set<string> = this.parent.displayedLeafColIds
    ): ReturnType<typeof resolveDropEngine> {
        return resolveDropEngine({
            master: this.parent.currentState,
            chainOf: colId => (this.parentChainMap.get(colId) ?? []).map(g => g.groupId),
            side: this.pinned,
            isDisplayed: id => displayed.has(id),
            lockColumnGroups: this.targetGridModel.lockColumnGroups,
            movingLeafColIds,
            dragUnitGroupId,
            target: targetData
                ? {
                      id: targetData.id,
                      isGroup: !!targetData.isGroup,
                      leafColIds: targetData.leafColIds
                  }
                : null,
            position,
            makeVisible
        });
    }

    /** Move columns into this bucket at the given drop position. No-ops if the drop is disallowed. */
    private moveColumns(
        movingLeafColIds: string[],
        dragUnitGroupId: string | null,
        targetData: ColChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false
    ) {
        const {allowed, state} = this.resolveDrop(
            movingLeafColIds,
            dragUnitGroupId,
            targetData,
            position,
            makeVisible
        );
        if (allowed && state) this.parent.applyState(state);
    }

    private getLastDisplayedRow() {
        const {agApi} = this.chooserGridModel,
            lastIdx = (agApi?.getDisplayedRowCount() ?? 0) - 1;
        return lastIdx >= 0 ? agApi?.getDisplayedRowAtIndex(lastIdx) : null;
    }

    /** True if committing `state` leaves every bucket's rendered view unchanged (spec §5A Rule B). */
    private isNoOpDrop(
        state: ColumnState[],
        displayed: Set<string> = this.parent.displayedLeafColIds
    ): boolean {
        return isNoOpDropEngine(state, this.parent.currentState, id => displayed.has(id));
    }

    /**
     * Map a resolved drop `state` to a single canonical indicator row, so the drag line neither flickers
     * between "below row N" / "above row N+1" nor sits at the raw cursor position. Anchors 'above' the
     * first rendered column following the moved block, or 'below' the last row if none.
     */
    private getDropHighlight(
        state: ColumnState[],
        movingLeafColIds: string[]
    ): IsRowValidDropPositionResult {
        const {pinned} = this,
            {agApi, store} = this.chooserGridModel,
            movingIds = new Set(movingLeafColIds),
            bucket = state.filter(cs => (cs.pinned ?? null) === pinned),
            startIdx = bucket.findIndex(cs => movingIds.has(cs.colId));

        const belowLast = (): IsRowValidDropPositionResult => ({
            allowed: true,
            highlight: true,
            position: 'below',
            target: this.getLastDisplayedRow()
        });
        if (startIdx < 0) return belowLast();

        let followingColId: string = null;
        for (let i = startIdx; i < bucket.length; i++) {
            const {colId} = bucket[i];
            if (movingIds.has(colId)) continue;
            // respectFilter: a filtered-out row has no ag-grid line, so it can't anchor the indicator.
            if (store.getById(colId, true)) {
                followingColId = colId;
                break;
            }
        }
        if (followingColId == null) return belowLast();

        const dragGroupIds = new Set<string>();
        movingLeafColIds.forEach(id =>
            this.parentChainMap.get(id)?.forEach(g => dragGroupIds.add(g.groupId))
        );

        const anchor = this.getGroupBoundaryRecord(followingColId, dragGroupIds),
            node = anchor ? agApi?.getRowNode(anchor.agId) : null;
        return node
            ? {allowed: true, highlight: true, position: 'above', target: node}
            : belowLast();
    }

    /**
     * Resolve the row to anchor 'above' for an insertion preceding `colId`. Climbs to the outermost
     * enclosing group whose first leaf is `colId`, stopping short of any group in `dragGroupIds` - so a
     * within-group reorder anchors above that group's first child, not its header.
     */
    private getGroupBoundaryRecord(colId: string, dragGroupIds: Set<string>): StoreRecord {
        const {store} = this.chooserGridModel,
            chain = this.parentChainMap.get(colId) ?? [];
        let rec = store.getById(colId, true),
            depth = chain.length - 1; // innermost group enclosing colId; climbs outward
        while (rec?.data.parentId && depth >= 0) {
            const parent = store.getById(rec.data.parentId, true);
            if (!parent || parent.data.leafColIds[0] !== colId) break;
            if (dragGroupIds.has(chain[depth].groupId)) break;
            rec = parent;
            depth--;
        }
        return rec;
    }

    /**
     * Empty-bucket prompt. Pinned rails pair the text with a pin-direction arrow, so the empty strip
     * still signals which way it pins; the unpinned bucket has no direction and stands alone.
     */
    private emptyDropHint(text: string): ReactNode {
        const {pinned} = this;
        if (!pinned) return text;

        const arrow =
            pinned === 'left'
                ? Icon.arrowToLeft({className: 'xh-col-chooser__drop-hint__arrow', size: 'sm'})
                : Icon.arrowToRight({className: 'xh-col-chooser__drop-hint__arrow', size: 'sm'});
        return hbox({
            className: 'xh-col-chooser__drop-hint',
            items: pinned === 'left' ? [arrow, span(text)] : [span(text), arrow]
        });
    }

    private createGridModel(emptyText: string) {
        return new GridModel({
            treeMode: true,
            treeStyle: 'none',
            clicksToExpand: 0,
            expandLevel: -1,
            ...chooserGridConfig,
            sortBy: 'sortOrder',
            emptyText: this.emptyDropHint(emptyText),
            onKeyDown: e => {
                const {selectedRecords} = this.chooserGridModel;
                if (isEmpty(selectedRecords)) return;

                if (e.code === 'Space') {
                    this.toggleVisibility(selectedRecords.map(rec => rec.id));
                    e.stopPropagation();
                    e.preventDefault();
                }
            },
            store: {
                // Matching a group header reveals its columns (leaf->ancestor is automatic).
                filterIncludesChildren: true,
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'chooserGroup', type: 'string'},
                    {name: 'visible', type: 'auto'},
                    {name: 'muted', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'movable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            rowClassRules: {
                'xh-col-chooser__column-row': () => true,
                'xh-col-chooser__column-row--hidden': ({data: rec}) => rec.data.muted === true
            },
            columns: [
                chooserNameColumn(true),
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [
                        {
                            icon: Icon.checkSquare(),
                            displayFn: ({record}) => {
                                // A static lock even in library mode, where the grip stays live for
                                // reorder/re-pin but a drop onto the library can't hide it.
                                if (isVisibilityLocked(record.data as ColChooserData)) {
                                    return {
                                        icon: Icon.lock(),
                                        disabled: true
                                    };
                                }

                                // Dragging to the library hides instead - but keep the column's width,
                                // so the layout holds stable across the toggle.
                                if (this.parent.isLibraryShown) return {hidden: true};

                                const {visible} = record.data;
                                if (visible === null) {
                                    return {icon: Icon.squareMinus()};
                                }

                                return visible
                                    ? {icon: Icon.checkSquare(), intent: 'primary'}
                                    : {icon: Icon.square(), intent: null};
                            },
                            actionFn: ({record}) => this.toggleVisibility(record.data.id)
                        }
                    ]
                },
                {
                    field: 'sortOrder',
                    hidden: true
                }
            ]
        });
    }
}

/**
 * True when a row's visibility can't be toggled - a non-hideable column that is currently shown. One
 * that is already hidden stays togglable, else the user could never get it back.
 */
function isVisibilityLocked(data: ColChooserData): boolean {
    return !data.hideable && !data.muted;
}

/**
 * Aggregate visibility over hideable leaves: true (all shown) / false (none) / null (mixed). No
 * hideable leaves reads as false, so the toggle acts as "show".
 */
function aggregateVisibility(total: number, hiddenCount: number): boolean | null {
    if (total === 0) return false;
    if (hiddenCount === 0) return true;
    if (hiddenCount === total) return false;
    return null;
}

function getActiveGroupId(
    chain: ColumnGroup[],
    depth: number,
    groupInstanceCounts: Map<string, number>
): string {
    const groupId = chain[depth].groupId,
        count = groupInstanceCounts.get(groupId) ?? 1;
    return count > 1 ? `${groupId}_${count}` : groupId;
}

/** The columns being dragged, aggregated across one or more selected rows. */
interface DragPayload {
    /** Drives the move/validation engine; a single row may contribute many leaves. */
    leafColIds: string[];
    recordIds: Set<string>;
    groupIds: string[];
    /** Set only when exactly one group is dragged, marking an explicit group drag over a leaf drag. */
    dragUnitGroupId: string | null;
    /** A drag out of the Column Library, which unhides on drop. */
    fromLibrary: boolean;
}

/** Extract the chooser records from the dragged ag-grid row nodes. */
function getDragRecords(nodes: any[]): ColChooserData[] {
    return (nodes ?? []).map(getChooserData).filter(Boolean) as ColChooserData[];
}

/** Aggregate the dragged chooser records into a single {@link DragPayload}. */
function buildDragPayload(records: ColChooserData[]): DragPayload | null {
    if (!records.length) return null;

    const leafColIds = new Set<string>(),
        recordIds = new Set<string>(),
        groupIds: string[] = [];
    let fromLibrary = false;
    records.forEach(rec => {
        rec.leafColIds.forEach(id => leafColIds.add(id));
        recordIds.add(rec.id);
        if (rec.isGroup) groupIds.push(rec.id);
        if (rec.fromLibrary) fromLibrary = true;
    });

    const dragUnitGroupId = groupIds.length === 1 ? groupIds[0] : null;
    return {leafColIds: [...leafColIds], recordIds, groupIds, dragUnitGroupId, fromLibrary};
}

/** Recursively collect leaf colIds for a group from its actual children in the record set. */
function collectLeafColIds(
    group: ColChooserData,
    childrenByParent: Map<string, ColChooserData[]>
): string[] {
    const ids: string[] = [];
    for (const rec of childrenByParent.get(group.id) ?? []) {
        if (rec.isGroup) {
            ids.push(...collectLeafColIds(rec, childrenByParent));
        } else {
            ids.push(rec.id);
        }
    }
    return ids;
}
