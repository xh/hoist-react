/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import type {HSide, Some} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import type {
    GridOptions,
    IsRowValidDropPositionParams,
    IsRowValidDropPositionResult,
    RowDragEndEvent,
    RowDropTargetPosition
} from '@xh/hoist/kit/ag-grid';
import {castArray, findLastIndex, isEmpty} from 'lodash';

import type {ColumnChooserModel} from '../ColumnChooserModel';
import {
    ChooserColumnName,
    type ColumnChooserData,
    type ColumnChooserDropParticipant,
    getChooserData
} from './ColumnChooserUtils';

export interface ColumnChooserBucketConfig {
    parent: ColumnChooserModel;
    pinned: HSide | null;
    /** Label shown in the bucket's docked summary header row. */
    summaryName: string;
    emptyText: string;
}

/**
 * Per-bucket model backing a single chooser grid (pinned-left, unpinned, or pinned-right).
 * Owns its slice of the target grid's columnState - building chooser records, validating and
 * handling drag/drop, and toggling visibility. The parent {@link ColumnChooserModel}
 * orchestrates the buckets, providing the target GridModel and the state commit chokepoint.
 */
export class ColumnChooserBucketModel extends HoistModel implements ColumnChooserDropParticipant {
    override xhImpl = true;

    readonly parent: ColumnChooserModel;
    readonly pinned: HSide | null;
    readonly summaryName: string;

    @managed
    chooserGridModel: GridModel;

    /** The target GridModel whose columns this bucket manages. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            suppressMoveWhenRowDragging: true,
            suppressGroupRowsSticky: true,
            rowDragMultiRow: true,
            rowDragText: (params, count) =>
                count > 1 ? `${count} columns` : (getChooserData(params.rowNode)?.name ?? ''),
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

    constructor({parent, pinned, summaryName, emptyText}: ColumnChooserBucketConfig) {
        super();
        this.parent = parent;
        this.pinned = pinned;
        this.summaryName = summaryName;

        this.chooserGridModel = this.createGridModel(emptyText);
    }

    /**
     * Rebuild this bucket's chooser records from the given (full) columnState. When `showHidden` is
     * false, hidden columns are dropped from the display entirely - they live in the Column Library
     * instead - and the per-row action becomes a hide-only control (see the action column below).
     */
    syncFromState(columnState: ColumnState[], showGroups: boolean, showHidden: boolean) {
        let slice = columnState.filter(cs => (cs.pinned ?? null) === this.pinned);
        if (!showHidden) slice = slice.filter(cs => !cs.hidden);
        this.loadData(this.buildData(slice), this.buildSummary(slice), showGroups);
    }

    /** Show or hide this bucket's per-row visibility action column. */
    setActionColumnVisible(visible: boolean) {
        this.chooserGridModel.setColumnVisible(actionCol.colId, visible);
    }

    toggleVisibility(recordIds: Some<StoreRecordId>) {
        const {targetGridModel: gridModel} = this;
        if (!gridModel) return;

        const {store} = this.chooserGridModel,
            updates: Partial<ColumnState>[] = [];

        castArray(recordIds).forEach(id => {
            const record = store.getById(id);
            if (!record || !record.data.hideable) return;

            // Hide when fully or partially visible (true/null); show when fully hidden (false)
            const hidden = record.data.visible !== false;
            record.data.leafColIds.forEach((colId: string) => {
                // A group's aggregate hideable can be true while it contains a locked leaf - never
                // hide such a leaf. Showing it is a no-op (a non-hideable column stays visible).
                if (hidden && !gridModel.getColumn(colId)?.hideable) return;
                updates.push({colId, hidden});
            });
        });

        gridModel.updateColumnState(updates);
    }

    /**
     * Validate a proposed drop position during unmanaged row dragging within this bucket.
     */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        const payload = buildDragPayload(params.rows ?? [params.source]);
        let target = params.target,
            {position} = params;

        // When the cursor is past the last row in a tree with expanded groups, ag-grid walks
        // target up to the outermost ancestor group — which makes the drop-indicator line
        // render under that group header instead of under the actual last leaf. Re-pin target
        // to the last displayed row.
        if (!params.overNode) {
            const lastRow = this.getLastDisplayedRow();
            if (lastRow) {
                target = lastRow;
                position = 'below';
            }
        }

        const targetData = getChooserData(target);
        if (!payload || !targetData) return {allowed: false};
        // A row can't be dropped onto one of the dragged rows themselves - except a drop from the
        // Column Library onto the same column's inline (hidden) row, which unhides it in place.
        if (payload.recordIds.has(targetData.id) && !payload.fromLibrary) return {allowed: false};

        if (targetData.isGroup) {
            // Hovering a group row always means "before the group" - getDropHighlight then resolves
            // to the group's first child (when the dragged column belongs to the group) or above the
            // group header (when it doesn't). ag-grid otherwise uses the cursor's half over the group
            // row to mean before vs. after the whole group, which behaves differently for cross-bucket
            // drags (cursor-relative) than in-bucket drags - this normalizes both.
            position = 'above';
        } else if (position === 'inside') {
            // Can't drop "inside" a leaf — treat as "below"
            position = 'below';
        }

        // Prevent dropping a dragged group inside itself
        if (payload.groupIds.some(gid => this.isDescendantOf(targetData.id, gid))) {
            return {allowed: false};
        }

        // Reject (and don't preview) drops the commit will refuse - splitting a locked group - so
        // the drag indicator agrees with what a drop actually does. This callback runs on the
        // target grid for cross-bucket drags too, so it gates those. A drop from the library unhides
        // its columns, so validate against that to gate it like the commit will.
        if (this.isDropDisallowed(payload.leafColIds, targetData, position, payload.fromLibrary)) {
            return {allowed: false};
        }

        // Suppress the indicator when the drop would leave the order unchanged. A drop from the
        // Column Library always changes state (it unhides), so it is never a no-op.
        if (!payload.fromLibrary && this.isNoOpMove(payload.leafColIds, targetData, position)) {
            return {allowed: false};
        }

        // Pin the indicator to a single canonical row by mapping the real insertion point to the
        // row that will follow it (see getDropHighlight). This removes the ~1px above/below flicker
        // between adjacent rows and ensures a drop landing before a group renders above the group
        // header, not above its first child (the dropped column lands before the group in the tree).
        return this.getDropHighlight(payload.leafColIds, targetData, position, target);
    }

    /** Handle intra-bucket drag end. */
    handleRowDragEnd(event: RowDragEndEvent) {
        const payload = buildDragPayload(event.nodes);
        if (!payload) return;

        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed) return;

        const targetData = getChooserData(dropInfo.target);
        if (!targetData) return;

        const {position} = dropInfo;
        if (position === 'none') return;

        this.moveColumns(payload.leafColIds, targetData, position);
    }

    /**
     * Handle a drop into this bucket from another bucket, via an ag-grid row drop zone. Reuses the
     * target/position our {@link getValidDropPosition} already computed for the drag (event.rowsDrop)
     * - the same group-aware logic as an intra-bucket drop - rather than re-deriving from the cursor,
     * so cross-bucket drops over groups behave identically. Falls back to "append to end" only when
     * there's no row under the cursor (empty bucket or below the last row).
     */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColumnChooserDropParticipant) {
        if (source === this) return;

        const payload = buildDragPayload(event.nodes);
        if (!payload) return;

        // A drop arriving from the Column Library means "show" the columns - clear their hidden flag
        // as they land in this (visible) bucket. Inter-bucket drags keep their hidden state.
        const makeVisible = source === this.parent.libraryModel;

        const dropInfo = event.rowsDrop;
        if (dropInfo?.allowed && dropInfo.position !== 'none') {
            const targetData = getChooserData(dropInfo.target);
            if (targetData) {
                this.moveColumns(payload.leafColIds, targetData, dropInfo.position, makeVisible);
                return;
            }
        }

        // No valid row under the cursor (empty bucket / below the last row) - append. A drop rejected
        // over an actual row (hidden/locked/no-op) falls through to a no-op; moveColumns re-validates.
        if (!event.overNode) this.moveColumns(payload.leafColIds, null, 'below', makeVisible);
    }

    /**
     * Drag-image icon name for a cross-bucket drag hovering this bucket's grid. ag-grid hardcodes
     * the external drop-zone icon to 'move' regardless of `isRowValidDropPosition`; ColumnChooserModel
     * injects this as the zone's getIconName. Shows 'notAllowed' when hovering an actual row at a
     * position the drop would refuse (e.g. a locked-group split) - read from the resolved drop target
     * ag-grid computes from our {@link getValidDropPosition}. A drop over empty space (no `overNode`)
     * is an append and stays allowed. Otherwise a drop into a pinned bucket shows 'pinned', the
     * unpinned bucket 'move'.
     */
    getCrossBucketDropIcon(draggingEvent: any): string {
        const dropTarget = draggingEvent?.dropTarget;
        if (dropTarget?.overNode && dropTarget.allowed === false) return 'notAllowed';

        const node = draggingEvent?.dragItem?.rowNode ?? draggingEvent?.dragItem?.rowNodes?.[0],
            sourceData = getChooserData(node);
        if (!sourceData) return 'move';
        return this.pinned ? 'pinned' : 'move';
    }

    //-----------------
    // Implementation
    //-----------------

    /**
     * Build the docked summary header record for this bucket. Its `name` labels the bucket and
     * its `visible` field is the bucket-scoped aggregate visibility (true/false/null). Toggling
     * it applies to all hideable leaf columns in the bucket via {@link toggleVisibility}.
     */
    private buildSummary(slice: ColumnState[]): ColumnChooserData {
        const {targetGridModel: gridModel} = this,
            hideableLeaves = slice.filter(cs => {
                const col = gridModel.getColumn(cs.colId);
                return col && !col.excludeFromChooser && col.hideable;
            }),
            hiddenCount = hideableLeaves.filter(cs => cs.hidden).length,
            total = hideableLeaves.length;

        const visible =
            total === 0 ? false : hiddenCount === 0 ? true : hiddenCount === total ? false : null;

        return {
            id: `summary-${this.pinned ?? 'none'}`,
            name: this.summaryName,
            description: '',
            visible,
            isGroup: false,
            hideable: total > 0,
            movable: false,
            parentId: null,
            sortOrder: -1,
            leafColIds: hideableLeaves.map(cs => cs.colId)
        };
    }

    /**
     * Build chooser records from a slice of columnState (this bucket's worth, in display order).
     *
     * Iterates the slice (source of truth for display order within the bucket), and for each
     * leaf column looks up its parent group chain from the column definitions. Adjacent
     * columns sharing the same group are merged under a single group node. Non-adjacent
     * columns from the same group produce separate group instances (split groups).
     *
     * Group records are created with empty leafColIds in the first pass — a second pass
     * populates them from actual children so split groups only contain their own leaves.
     */
    private buildData(columnState: ColumnState[]): ColumnChooserData[] {
        const {targetGridModel: gridModel} = this,
            stateById = new Map(columnState.map(cs => [cs.colId, cs])),
            parentChainMap = buildParentChainMap(gridModel.columns);

        // 1) Walk columnState in order, creating leaf and group records
        const data: ColumnChooserData[] = [],
            groupInstanceCounts = new Map<string, number>(),
            activeGroups: (string | null)[] = [];

        columnState.forEach((state, idx) => {
            const col = gridModel.findColumn(gridModel.columns, state.colId);
            if (!col || col.excludeFromChooser) return;

            const chain = parentChainMap.get(state.colId) ?? [];

            // Determine how deep the shared active group chain extends
            let sharedDepth = 0;
            for (let d = 0; d < chain.length; d++) {
                if (activeGroups[d] === chain[d].groupId) {
                    sharedDepth = d + 1;
                } else {
                    break;
                }
            }
            activeGroups.length = sharedDepth;

            // Open new group instances for the rest of the chain
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
                    visible: false,
                    isGroup: true,
                    hideable: false,
                    movable: true,
                    parentId: parentInstanceId,
                    sortOrder: idx,
                    leafColIds: []
                });

                activeGroups[d] = group.groupId;
            }

            // Add the leaf column chooser data
            const parentInstanceId =
                chain.length > 0
                    ? getActiveGroupId(chain, chain.length - 1, groupInstanceCounts)
                    : null;

            data.push({
                id: state.colId,
                name: col.chooserName,
                description: col.chooserDescription ?? '',
                visible: !state.hidden,
                isGroup: false,
                hideable: col.hideable,
                movable: col.movable,
                parentId: parentInstanceId,
                sortOrder: idx,
                leafColIds: [state.colId]
            });
        });

        // 2) Populate group leafColIds and derive visibility from actual children
        const columnDataMap = new Map(data.map(r => [r.id, r]));
        data.forEach(it => {
            if (!it.isGroup) return;

            it.leafColIds = collectLeafColIds(it, columnDataMap);

            // Aggregate visibility over the group's *hideable* leaves only - the toggle can only
            // act on those, so a group whose sole visible member is locked must still read as "all
            // hidden" (and toggle back to shown) rather than being stuck permanently "mixed".
            const hideableLeafIds = it.leafColIds.filter(id => gridModel.getColumn(id)?.hideable),
                hiddenCount = hideableLeafIds.filter(id => stateById.get(id)?.hidden).length,
                total = hideableLeafIds.length;
            it.visible =
                total === 0
                    ? false
                    : hiddenCount === 0
                      ? true
                      : hiddenCount === total
                        ? false
                        : null;

            it.hideable = total > 0;

            it.movable = it.leafColIds.every(id => gridModel.getColumn(id)?.movable);
        });

        return data;
    }

    private loadData(data: ColumnChooserData[], summary: ColumnChooserData, showGroups: boolean) {
        const {store} = this.chooserGridModel,
            leaves = data.filter(r => !r.isGroup),
            leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            store.loadData(leaves, summary);
            return;
        }

        // Tree mode: build nested structure with groups as parents
        const groups = data.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id))),
            groupIdSet = new Set(groups.map(r => r.id));

        const childrenMap = new Map<string, ColumnChooserData[]>();
        [...groups, ...leaves].forEach(it => {
            if (it.parentId && groupIdSet.has(it.parentId)) {
                if (!childrenMap.has(it.parentId)) childrenMap.set(it.parentId, []);
                childrenMap.get(it.parentId).push(it);
            }
        });

        const buildNested = (r: ColumnChooserData): object => {
            const children = childrenMap.get(r.id);
            return children ? {...r, children: children.map(buildNested)} : {...r};
        };

        const rootGroups = groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootLeaves = leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootData = [...rootGroups, ...rootLeaves].map(buildNested);

        store.loadData(rootData, summary);
    }

    /** Check if a record is a descendant of a potential ancestor in this bucket's tree. */
    private isDescendantOf(candidateId: string, ancestorId: string): boolean {
        const {store} = this.chooserGridModel;
        let current = store.getById(candidateId);
        while (current?.data.parentId) {
            if (current.data.parentId === ancestorId) return true;
            current = store.getById(current.data.parentId);
        }
        return false;
    }

    /**
     * Whether a proposed drop must be rejected. The single validation predicate shared by the
     * drag-preview path ({@link getValidDropPosition}) and the commit path ({@link moveColumns}),
     * so the indicator always agrees with what a drop will do. Rejects any move that would leave a
     * column group's leaves non-contiguous while lockColumnGroups is set - evaluated against the
     * full resulting state, so it also gates cross-bucket moves.
     */
    private isDropDisallowed(
        movingLeafColIds: string[],
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false
    ): boolean {
        if (this.targetGridModel.lockColumnGroups) {
            // Validate the state the move will actually produce - including unhiding columns
            // dropped from the library - so the visible-contiguity check matches the real result.
            const newState = this.simulateMove(movingLeafColIds, targetData, position, makeVisible);
            if (
                newState &&
                !areGroupsContiguous(newState, buildParentChainMap(this.targetGridModel.columns))
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build the full column state a move would produce (across all buckets), re-pinning the moving
     * leaves to this bucket. Returns null if nothing would move. The single source of truth for
     * both validating a drop ({@link isDropDisallowed}) and performing it ({@link moveColumns}).
     */
    private simulateMove(
        movingLeafColIds: string[],
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false
    ): ColumnState[] | null {
        const {targetGridModel: gridModel} = this,
            movingIds = new Set(movingLeafColIds),
            movingState = gridModel.columnState
                .filter(cs => movingIds.has(cs.colId))
                .map(cs => ({...cs, pinned: this.pinned, ...(makeVisible ? {hidden: false} : {})}));

        if (!movingState.length) return null;

        const slices = partitionByPinned(gridModel.columnState, movingIds),
            fullSlice = gridModel.columnState.filter(cs => (cs.pinned ?? null) === this.pinned),
            targetSlice = slices[this.pinned ?? 'none'],
            insertionIndex = targetData
                ? computeInsertionIndex(fullSlice, movingIds, targetData, position)
                : targetSlice.length;

        targetSlice.splice(insertionIndex, 0, ...movingState);
        return [...slices.left, ...slices.none, ...slices.right];
    }

    /**
     * Move columns into this bucket at the given drop position - from elsewhere in this bucket
     * or from another bucket - committing the resulting normalized full state via the parent.
     * No-ops if the drop is disallowed (see {@link isDropDisallowed}).
     */
    private moveColumns(
        movingLeafColIds: string[],
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false
    ) {
        if (!this.targetGridModel) return;
        if (this.isDropDisallowed(movingLeafColIds, targetData, position, makeVisible)) return;

        const newState = this.simulateMove(movingLeafColIds, targetData, position, makeVisible);
        if (newState) this.parent.commit(newState);
    }

    private getLastDisplayedRow() {
        const {agApi} = this.chooserGridModel,
            lastIdx = (agApi?.getDisplayedRowCount() ?? 0) - 1;
        return lastIdx >= 0 ? agApi?.getDisplayedRowAtIndex(lastIdx) : null;
    }

    /**
     * True if dropping the moving leaves at the given target/position would reproduce the bucket's
     * current order - i.e. the drop is a no-op. Mirrors {@link moveColumns} (splice moving block
     * into the remaining slice at the computed index) and compares the result to the original.
     */
    private isNoOpMove(
        movingLeafColIds: string[],
        targetData: ColumnChooserData,
        position: RowDropTargetPosition
    ): boolean {
        const movingIds = new Set(movingLeafColIds),
            slice = this.targetGridModel.columnState.filter(
                cs => (cs.pinned ?? null) === this.pinned
            ),
            movingState = slice.filter(cs => movingIds.has(cs.colId));

        // Cross-bucket source has no leaves in this slice - never a no-op for this bucket.
        if (!movingState.length) return false;

        const remaining = slice.filter(cs => !movingIds.has(cs.colId)),
            insertIdx = computeInsertionIndex(slice, movingIds, targetData, position),
            result = [...remaining];
        result.splice(insertIdx, 0, ...movingState);

        return result.every((cs, i) => cs.colId === slice[i].colId);
    }

    /**
     * Drop-indicator highlight (locked or unlocked). The insertion index is computed exactly as the
     * move will perform it, then mapped to the row that follows it - shown as 'above' that row. When
     * that following column is a group's first leaf, the indicator climbs to the group header so
     * "before the group" renders as one line above the header rather than flipping with "above the
     * first child" - the dropped column lands before the group in the tree. Positions within a group
     * (the following column is not its group's first leaf) stay fine-grained, supporting split-group
     * drops when unlocked. Drops past the end pin to the bottom of the last displayed row.
     */
    private getDropHighlight(
        movingLeafColIds: string[],
        targetData: ColumnChooserData,
        position: RowDropTargetPosition,
        fallbackTarget: any
    ): IsRowValidDropPositionResult {
        const {agApi} = this.chooserGridModel,
            movingIds = new Set(movingLeafColIds),
            slice = this.targetGridModel.columnState.filter(
                cs => (cs.pinned ?? null) === this.pinned
            ),
            remaining = slice.filter(cs => !movingIds.has(cs.colId)),
            insertIdx = computeInsertionIndex(slice, movingIds, targetData, position);

        // Dropping past the last column - pin to the bottom of the final row.
        if (insertIdx >= remaining.length) {
            return {
                allowed: true,
                highlight: true,
                position: 'below',
                target: this.getLastDisplayedRow()
            };
        }

        // Groups the source belongs to (by groupId, not instance) - so a cross-bucket drag from the
        // same group is recognized even though its members live in a different bucket's instance.
        const parentChainMap = buildParentChainMap(this.targetGridModel.columns),
            sourceGroupIds = new Set<string>();
        movingLeafColIds.forEach(id =>
            parentChainMap.get(id)?.forEach(g => sourceGroupIds.add(g.groupId))
        );

        // Skip forward past any following columns with no displayed row - hidden columns when
        // showHidden is off - to the next column actually rendered in this bucket. Anchoring on a
        // non-displayed row leaves the indicator flickering on the raw cursor position; pinning to
        // the next real row (or the bottom, if none follow) keeps it on a single canonical line.
        const {store} = this.chooserGridModel;
        let followingColId: string = null;
        for (let i = insertIdx; i < remaining.length; i++) {
            if (store.getById(remaining[i].colId)) {
                followingColId = remaining[i].colId;
                break;
            }
        }

        if (followingColId == null) {
            return {
                allowed: true,
                highlight: true,
                position: 'below',
                target: this.getLastDisplayedRow()
            };
        }

        const followingRec = this.getGroupBoundaryRecord(
                followingColId,
                sourceGroupIds,
                parentChainMap
            ),
            node = followingRec ? agApi?.getRowNode(followingRec.agId) : null;
        return node
            ? {allowed: true, highlight: true, position: 'above', target: node}
            : {allowed: true, highlight: true, position, target: fallbackTarget};
    }

    /**
     * Resolve the row to highlight 'above' for an insertion that precedes the given column. Climbs
     * to the outermost enclosing group whose first leaf is this column (a true group boundary);
     * otherwise returns the column's own record (a position within a group). Stops short of any
     * group the dragged column belongs to - it stays inside that group, so the indicator sits above
     * its first child, not above the group header. Membership is by groupId (via the chain), so this
     * holds for a cross-bucket drag from the same group, whose target-bucket instance has different
     * leaves.
     */
    private getGroupBoundaryRecord(
        colId: string,
        sourceGroupIds: Set<string>,
        parentChainMap: Map<string, ColumnGroup[]>
    ): StoreRecord {
        const {store} = this.chooserGridModel,
            chain = parentChainMap.get(colId) ?? [];
        let rec = store.getById(colId),
            depth = chain.length - 1; // innermost group enclosing colId; climbs outward
        while (rec?.data.parentId && depth >= 0) {
            const parent = store.getById(rec.data.parentId);
            if (!parent || parent.data.leafColIds[0] !== colId) break;
            if (sourceGroupIds.has(chain[depth].groupId)) break;
            rec = parent;
            depth--;
        }
        return rec;
    }

    private createGridModel(emptyText: string) {
        return new GridModel({
            treeMode: true,
            treeStyle: 'none',
            showSummary: 'top',
            clicksToExpand: 0,
            expandLevel: -1,
            sortBy: 'sortOrder',
            emptyText,
            hideEmptyTextBeforeLoad: false,
            selModel: 'multiple',
            hideHeaders: true,
            rowBorders: true,
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
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'auto'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'movable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            rowClassRules: {
                'xh-column-chooser__column-row': ({data: rec}) => !rec.isSummary,
                'xh-column-chooser__column-row--hidden': ({data: rec}) => rec.data.visible === false
            },
            columns: [
                {
                    field: 'name',
                    isTreeColumn: true,
                    rendererIsComplex: true,
                    flex: 1,
                    cellClass: 'xh-column-chooser__name-cell',
                    agOptions: {
                        cellRendererParams: {
                            // Re-specify Hoist defaults — agOptions merges shallow
                            suppressCount: true,
                            suppressDoubleClickExpand: true,
                            innerRenderer: ChooserColumnName
                        }
                    }
                },
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actionsShowOnSummaryRow: true,
                    actions: [
                        {
                            icon: Icon.checkSquare(),
                            displayFn: ({record}) => {
                                if (!record.data.hideable) {
                                    if (record.isSummary) {
                                        return {hidden: true};
                                    }

                                    return {
                                        icon: Icon.lock(),
                                        disabled: true
                                    };
                                }

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

//------------------
// Pure helpers
//------------------

/** Map each leaf colId to its parent group chain (outermost to innermost). */
function buildParentChainMap(columns: ColumnOrGroup[]): Map<string, ColumnGroup[]> {
    const ret = new Map<string, ColumnGroup[]>();
    const walk = (cols: ColumnOrGroup[], ancestors: ColumnGroup[]) => {
        for (const col of cols) {
            if (col instanceof ColumnGroup) {
                walk(col.children, [...ancestors, col]);
            } else {
                ret.set(col.colId, ancestors);
            }
        }
    };
    walk(columns, []);
    return ret;
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

/**
 * The columns being dragged, aggregated across one or more selected rows (a row may itself be a
 * group representing many leaves). The move/validation engine is driven entirely by `leafColIds`;
 * `recordIds`/`groupIds` gate the self-drop and group-inside-itself checks; `fromLibrary` flags a
 * drag out of the Column Library (which unhides on drop).
 */
interface DragPayload {
    leafColIds: string[];
    recordIds: Set<string>;
    groupIds: string[];
    fromLibrary: boolean;
}

/** Aggregate the dragged ag-grid row nodes into a single {@link DragPayload}. */
function buildDragPayload(nodes: any[]): DragPayload | null {
    const records = (nodes ?? []).map(getChooserData).filter(Boolean) as ColumnChooserData[];
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

    return {leafColIds: [...leafColIds], recordIds, groupIds, fromLibrary};
}

/** Recursively collect leaf colIds for a group from its actual children in the record set. */
function collectLeafColIds(
    group: ColumnChooserData,
    recordMap: Map<string, ColumnChooserData>
): string[] {
    const ids: string[] = [];
    for (const rec of recordMap.values()) {
        if (rec.parentId !== group.id) continue;
        if (rec.isGroup) {
            ids.push(...collectLeafColIds(rec, recordMap));
        } else {
            ids.push(rec.id);
        }
    }
    return ids;
}

/**
 * True if every column group's *visible* leaves are contiguous within each pinned section.
 *
 * Group locking is enforced per-bucket: a group MAY span pinned sections (e.g. one member pinned
 * while the rest stay unpinned - pinning never breaks group locking), but within each section the
 * group's leaves must be contiguous. So we check each section ([left], [none], [right]) on its own;
 * a group split across the boundary is allowed, a group split inside a single section is not.
 *
 * Hidden columns are excluded - they aren't rendered, so they can't visually split a group. This is
 * what lets a column be shown from the Column Library when its whole group is hidden (no visible
 * siblings to stay adjacent to), while still keeping visible group members together.
 */
function areGroupsContiguous(
    state: {colId: string; pinned?: HSide | null; hidden?: boolean}[],
    parentChainMap: Map<string, ColumnGroup[]>
): boolean {
    const sides: Array<HSide | null> = ['left', null, 'right'];
    return sides.every(side =>
        isSectionContiguous(
            state.filter(cs => !cs.hidden && (cs.pinned ?? null) === side),
            parentChainMap
        )
    );
}

/** True if every column group's leaves form a contiguous range within a single bucket's slice. */
function isSectionContiguous(
    section: {colId: string}[],
    parentChainMap: Map<string, ColumnGroup[]>
): boolean {
    // Track each group's last-seen leaf index; a non-consecutive jump means it's split.
    const lastIdx = new Map<string, number>(),
        closed = new Set<string>();

    for (let i = 0; i < section.length; i++) {
        const chain = parentChainMap.get(section[i].colId);
        if (!chain) continue;

        const currentGroupIds = new Set(chain.map(g => g.groupId));

        // Any group that was active but isn't in this chain is now closed
        for (const groupId of lastIdx.keys()) {
            if (!currentGroupIds.has(groupId)) closed.add(groupId);
        }

        // If a group we previously closed shows up again, it's split
        for (const groupId of currentGroupIds) {
            if (closed.has(groupId)) return false;
            lastIdx.set(groupId, i);
        }
    }

    return true;
}

/**
 * Compute where the moving columns should be spliced into the bucket's moving-excluded slice.
 *
 * Anchors on the FULL slice - where the target's columns always exist, even when the moving block
 * is the only remaining leaf of a (split) group instance - then translates that anchor to an index
 * into the excluded array by counting the non-moving columns before it. Anchoring on `remaining`
 * instead would lose the target's position when its leaves are all excluded, wrongly collapsing to
 * an append-at-end. `slice.length` is returned only as a defensive fallback for a target that is
 * genuinely absent from the slice.
 */
function computeInsertionIndex(
    slice: {colId: string}[],
    movingIds: Set<string>,
    targetData: ColumnChooserData,
    position: RowDropTargetPosition
): number {
    // Anchor: the full-slice index before which the moving block lands.
    let anchor: number;
    if (targetData.isGroup) {
        const ids = new Set(targetData.leafColIds),
            firstIdx = slice.findIndex(cs => ids.has(cs.colId)),
            lastIdx = findLastIndex(slice, cs => ids.has(cs.colId));
        anchor = firstIdx === -1 ? slice.length : position === 'above' ? firstIdx : lastIdx + 1;
    } else {
        const targetIdx = slice.findIndex(cs => cs.colId === targetData.id);
        anchor = targetIdx === -1 ? slice.length : position === 'above' ? targetIdx : targetIdx + 1;
    }

    // Translate to the moving-excluded array: count non-moving columns preceding the anchor.
    let idx = 0;
    for (let i = 0; i < anchor; i++) {
        if (!movingIds.has(slice[i].colId)) idx++;
    }
    return idx;
}

/** Partition columnState by pinned side, optionally excluding a set of moving colIds. */
function partitionByPinned(state: ColumnState[], excludeIds?: Set<string>) {
    const filterFn = (cs: ColumnState) => !excludeIds?.has(cs.colId);
    return {
        left: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === 'left'),
        none: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === null),
        right: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === 'right')
    };
}
