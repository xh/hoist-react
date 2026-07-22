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
import {bindable, makeObservable} from '@xh/hoist/mobx';
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
    isNoOpDrop as isNoOpDropEngine
} from './colChooserDropEngine';
import {
    chooserDragAgOptions,
    chooserGridConfig,
    chooserNameColumn,
    type ColumnChooserData,
    type ColumnChooserDropParticipant,
    getChooserData
} from './ColumnChooserUtils';

export interface ColumnChooserBucketConfig {
    parent: ColChooserModel;
    pinned: HSide | null;
    /** Label shown in the bucket's compact Panel header. */
    title: string;
    emptyText: string;
}

/**
 * Per-bucket model backing a single chooser grid (pinned-left, unpinned, or pinned-right).
 * Owns its slice of the target grid's columnState - building chooser records, validating and
 * handling drag/drop, and toggling visibility. The parent {@link ColChooserModel}
 * orchestrates the buckets, providing the target GridModel and the state commit chokepoint.
 */
export class ColumnChooserBucketModel extends HoistModel implements ColumnChooserDropParticipant {
    override xhImpl = true;

    readonly parent: ColChooserModel;
    readonly pinned: HSide | null;
    readonly title: string;

    @managed
    chooserGridModel: GridModel;

    /** True while a cross-bucket drag is hovering this bucket - drives the empty-strip highlight. */
    @bindable
    dragOver: boolean = false;

    /**
     * The state resolved by the most recent valid {@link getValidDropPosition}, applied verbatim on
     * drop (see {@link applyPendingDrop}) so the commit never re-derives from the indicator anchor -
     * which is a lossy proxy that can re-resolve differently when a group spans buckets. Keyed by the
     * (target, position) we returned, i.e. the `event.rowsDrop` the drop handler receives.
     */
    private pendingDrop: {
        targetId: string | null;
        position: RowDropTargetPosition;
        state: ColumnState[];
    } = null;

    /** The target GridModel whose columns this bucket manages. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            ...chooserDragAgOptions,
            suppressGroupRowsSticky: true,
            // The action column reserves its width permanently (toggled by content, not presence),
            // so column layout never reflows - suppress ag-grid's slide animation for good measure.
            suppressColumnMoveAnimation: true,
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

    constructor({parent, pinned, title, emptyText}: ColumnChooserBucketConfig) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.pinned = pinned;
        this.title = title;

        this.chooserGridModel = this.createGridModel(emptyText);
    }

    //-----------------
    // Header state (rendered in the bucket's compact Panel header - see ColumnChooser view)
    //-----------------
    /** This bucket's slice of the current column state (columns pinned to this side). */
    private get slice(): ColumnState[] {
        return this.parent.currentState.filter(cs => (cs.pinned ?? null) === this.pinned);
    }

    /**
     * Leaf colIds currently rendered in this bucket's grid - the rows the user can actually see. Both
     * routing to the Column Library (showHidden) and any active Store filter narrow `store.records`,
     * so every visibility control scopes to this and never counts or toggles an out-of-view column.
     */
    private get renderedLeafIds(): Set<string> {
        const ids = new Set<string>();
        this.chooserGridModel.store.records.forEach(rec => {
            if (!rec.data.isGroup) ids.add(rec.id as string);
        });
        return ids;
    }

    /** Rendered hideable leaf columns - the columns the "toggle all" control acts on. */
    private get hideableLeaves(): ColumnState[] {
        const {targetGridModel: gridModel} = this,
            rendered = this.renderedLeafIds;
        return this.slice.filter(cs => {
            const col = gridModel.getColumn(cs.colId);
            return rendered.has(cs.colId) && col && !col.excludeFromChooser && col.hideable;
        });
    }

    /** True when this bucket holds any column the header toggle can show/hide. */
    get hasHideableColumns(): boolean {
        return !isEmpty(this.hideableLeaves);
    }

    /**
     * Count of this bucket's leaf columns as actually rendered - backs the view's empty-rail
     * detection. Reflects routing to the Column Library (showHidden) and any active filter, so a
     * pinned rail whose columns are all filtered out reads as empty - no separator, collapsed drop
     * strip - exactly like a genuinely empty one.
     */
    get columnCount(): number {
        return this.renderedLeafIds.size;
    }

    /** Bucket-scoped aggregate visibility over hideable leaves: true (all) / false (none) / null (mixed). */
    get aggregateVisible(): boolean | null {
        const leaves = this.hideableLeaves;
        return aggregateVisibility(leaves.length, leaves.filter(cs => cs.hidden).length);
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
     * Rebuild this bucket's chooser records from the given (full) columnState. When `showHidden` is
     * false, hidden columns are dropped from the display entirely - they live in the Column Library
     * instead - and the per-row action becomes a hide-only control (see the action column below).
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
            if (!record || !record.data.hideable) return;

            // Hide when fully or partially visible (true/null); show when fully hidden (false)
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

    /**
     * Validate a proposed drop position during unmanaged row dragging within this bucket.
     */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        // Invalidate any prior cache; only a successful resolution below re-arms it for the commit.
        this.pendingDrop = null;

        const payload = buildDragPayload(params.rows ?? [params.source]);
        let target = params.target,
            {position} = params;

        // No row under the cursor - it is above the first row or below the last (ag-grid also walks
        // `target` up to an ancestor group here, misplacing the indicator). Anchor to the nearer end
        // via `y` (0 = top of the first row, comparable to rowTop): above the content prepends, below
        // it appends. Without the `y` check, dropping above the first row wrongly falls through to an
        // append-at-end - which especially bites the top bucket, whose start sits at the top edge.
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
            // Normalize a group-row hover to "before the group" - resolveDrop anchors on the group's
            // run. ag-grid otherwise uses the cursor's half over the group row to mean before vs.
            // after, which differs between cursor-relative cross-bucket drags and in-bucket drags.
            position = 'above';
        } else if (position === 'inside') {
            // Can't drop "inside" a leaf — treat as "below"
            position = 'below';
        }

        // Prevent dropping onto the dragged leaves themselves. Gate on the dragged LEAVES, not on
        // every descendant of a dragged group: when a group spans buckets, its members in ANOTHER
        // bucket are valid rejoin targets, and blocking them wrongly stopped a spanning group's
        // portion from being dropped among its other-bucket members (spec C-SPAN). Dropping a group
        // onto its own node is still blocked by the recordIds check above.
        if (!payload.fromLibrary && payload.leafColIds.includes(targetData.id)) {
            return {allowed: false};
        }

        // Resolve the drop through the same engine the commit uses, so the indicator always agrees
        // with what the drop will do (splitting a locked group is rejected here and there). A drop
        // from the library unhides its columns, so resolve with makeVisible to gate it as the commit
        // will.
        const {allowed, state} = this.resolveDrop(
            payload.leafColIds,
            payload.dragUnitGroupId,
            targetData,
            position,
            payload.fromLibrary
        );
        if (!allowed || !state) return {allowed: false};

        // Suppress the indicator when the drop leaves the chooser visually unchanged - including one
        // whose only effect is reordering a visible column past an adjacent hidden one (a "nothing
        // happened" no-op to the user that silently churns the master order). A library drop unhides
        // its columns, so it always changes the rendered view and is never a no-op.
        if (!payload.fromLibrary && this.isNoOpDrop(state)) {
            return {allowed: false};
        }

        // Cache the validated state for the commit to apply verbatim (see pendingDrop / handlers), so
        // it never re-derives from the indicator anchor below. The anchor is a single canonical row
        // for a clean line (see getDropHighlight), but re-resolving from it can diverge when a group
        // spans buckets (its pinned member separates the run from the next visible row).
        const highlight = this.getDropHighlight(state, payload.leafColIds);
        this.pendingDrop = {
            targetId: getChooserData(highlight.target)?.id ?? null,
            position: highlight.position,
            state
        };
        return highlight;
    }

    /**
     * Apply the state {@link getValidDropPosition} validated for exactly this drop (matched against
     * `event.rowsDrop`), committing preview == commit by construction. Returns false if no cached
     * drop matches (the caller then falls back to re-resolving).
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

    /** Handle intra-bucket drag end. */
    handleRowDragEnd(event: RowDragEndEvent) {
        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed || dropInfo.position === 'none') return;
        this.applyPendingDrop(dropInfo);
    }

    /**
     * Handle a drop into this bucket from another bucket, via an ag-grid row drop zone. Applies the
     * state {@link getValidDropPosition} already validated for the drag (matched via `event.rowsDrop`)
     * so a cross-bucket drop commits exactly what was previewed. Falls back to a pin-in-place append
     * only when there's no row under the cursor (empty bucket) and hence no cached preview.
     */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColumnChooserDropParticipant) {
        if (source === this) return;

        const dropInfo = event.rowsDrop;
        if (dropInfo?.allowed && dropInfo.position !== 'none' && this.applyPendingDrop(dropInfo)) {
            return;
        }

        // No cached preview matched (empty bucket / no row under the cursor) - pin the dragged leaves
        // in place (§6). A drop from the Column Library also unhides them (makeVisible).
        if (!event.overNode) {
            const payload = buildDragPayload(event.nodes);
            if (!payload) return;
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
     * Drag-image icon name for a cross-bucket drag hovering this bucket's grid. ag-grid hardcodes
     * the external drop-zone icon to 'move' regardless of `isRowValidDropPosition`; ColChooserModel
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
    /** Leaf colId → ancestor group chain, shared across buckets by the parent {@link ColChooserModel}. */
    private get parentChainMap(): Map<string, ColumnGroup[]> {
        return this.parent.parentChainMap;
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
        const {targetGridModel: gridModel, parentChainMap} = this,
            stateById = new Map(columnState.map(cs => [cs.colId, cs]));

        // 1) Walk columnState in order, creating leaf and group records
        const data: ColumnChooserData[] = [],
            groupInstanceCounts = new Map<string, number>(),
            activeGroups: (string | null)[] = [];

        columnState.forEach((state, idx) => {
            const col = gridModel.getColumn(state.colId);
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
        const columnDataMap = new Map(data.map(r => [r.id, r]));
        data.forEach(it => {
            if (!it.isGroup) return;

            it.leafColIds = collectLeafColIds(it, columnDataMap);

            // Aggregate visibility over the group's *hideable* leaves only - the toggle can only
            // act on those, so a group whose sole visible member is locked must still read as "all
            // hidden" (and toggle back to shown) rather than being stuck permanently "mixed".
            const hideableLeafIds = it.leafColIds.filter(id => gridModel.isColumnHideable(id)),
                hiddenCount = hideableLeafIds.filter(id => stateById.get(id)?.hidden).length,
                total = hideableLeafIds.length;
            it.visible = aggregateVisibility(total, hiddenCount);
            it.hideable = total > 0;

            // Mute a group only when *every* rendered leaf child is hidden - independent of
            // hideability, so an all-locked (visible) group reads as shown, not dimmed.
            it.muted =
                !isEmpty(it.leafColIds) && it.leafColIds.every(id => stateById.get(id)?.hidden);

            it.movable = it.leafColIds.every(id => gridModel.isColumnMovable(id));
        });

        return data;
    }

    private loadData(data: ColumnChooserData[], showGroups: boolean) {
        const {store} = this.chooserGridModel,
            leaves = data.filter(r => !r.isGroup),
            leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            store.loadData(leaves);
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

        store.loadData(rootData);
    }

    /**
     * Adapt this bucket's live state to the pure {@link resolveDropEngine} - the single source of
     * truth for both the drag preview ({@link getValidDropPosition}) and the commit
     * ({@link moveColumns}). See `colChooserDropEngine.ts` and `docs/planning/locked-group-dnd-spec.md`.
     *
     * `dragUnitGroupId` is the groupId of an explicitly dragged group row (null for a leaf drag).
     */
    private resolveDrop(
        movingLeafColIds: string[],
        dragUnitGroupId: string | null,
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition,
        makeVisible: boolean = false
    ): {allowed: boolean; state: ColumnState[] | null} {
        const displayed = this.parent.displayedLeafColIds;
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

    /**
     * Move columns into this bucket at the given drop position, committing the resolved full state
     * via the parent. No-ops if the drop is disallowed. See {@link resolveDrop}.
     */
    private moveColumns(
        movingLeafColIds: string[],
        dragUnitGroupId: string | null,
        targetData: ColumnChooserData | null,
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
    private isNoOpDrop(state: ColumnState[]): boolean {
        const displayed = this.parent.displayedLeafColIds;
        return isNoOpDropEngine(state, this.parent.currentState, id => displayed.has(id));
    }

    /**
     * Map a resolved drop `state` to a single canonical indicator row, so the drag line neither
     * flickers between "below row N" / "above row N+1" nor sits at the raw cursor position. Anchors
     * 'above' the first column that follows the moved block in the resolved order and has a rendered
     * row in this bucket - climbing to a group header when that column heads a group the dragged unit
     * is not part of, so "before the group" shows as one line above the header rather than above its
     * first child. Falls to 'below' the last displayed row when the block lands at the bucket's end
     * (or past all remaining hidden columns).
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

        // First post-block column with a rendered row in this bucket - skips hidden columns (no
        // displayed row when showHidden is off) so the anchor lands on a real line.
        let followingColId: string = null;
        for (let i = startIdx; i < bucket.length; i++) {
            const {colId} = bucket[i];
            if (movingIds.has(colId)) continue;
            // respectFilter: a filtered-out row has no ag-grid line, so it's not a valid anchor.
            if (store.getById(colId, true)) {
                followingColId = colId;
                break;
            }
        }
        if (followingColId == null) return belowLast();

        // Groups the dragged unit belongs to - the climb stops short of these, keeping a within-group
        // reorder above the first child rather than jumping to the group header.
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
     * Resolve the row to anchor 'above' for an insertion that precedes `colId`. Climbs to the
     * outermost enclosing group whose first leaf is `colId` (a true group boundary); otherwise
     * returns the column's own record (a position within a group). Stops short of any group the
     * dragged unit belongs to, so the anchor stays above that group's first child, not its header.
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
     * Empty-bucket prompt. Pinned rails pair the text with a pin-direction arrow (leading on the
     * left rail, trailing on the right) so the empty strip still signals which way it pins. The
     * unpinned bucket has no direction, so its plain text stands alone.
     */
    private emptyDropHint(text: string): ReactNode {
        const {pinned} = this;
        if (!pinned) return text;

        const arrow =
            pinned === 'left'
                ? Icon.arrowToLeft({className: 'xh-column-chooser__drop-hint__arrow', size: 'sm'})
                : Icon.arrowToRight({className: 'xh-column-chooser__drop-hint__arrow', size: 'sm'});
        return hbox({
            className: 'xh-column-chooser__drop-hint',
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
                'xh-column-chooser__column-row': () => true,
                'xh-column-chooser__column-row--hidden': ({data: rec}) => rec.data.muted === true
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
                                // Columns are hidden by dragging to the library instead - keep the
                                // column's width to hold layout stable, but render no control.
                                if (this.parent.isLibraryShown) return {hidden: true};

                                if (!record.data.hideable) {
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

/**
 * Aggregate visibility over a set of hideable leaves: true (all shown) / false (none shown) /
 * null (mixed). No hideable leaves reads as false, so the toggle acts as "show".
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

/**
 * The columns being dragged, aggregated across one or more selected rows (a row may itself be a
 * group representing many leaves). The move/validation engine is driven entirely by `leafColIds`;
 * `recordIds`/`groupIds` gate the self-drop and group-inside-itself checks; `fromLibrary` flags a
 * drag out of the Column Library (which unhides on drop). `dragUnitGroupId` is the id of the single
 * group being dragged as a unit (null unless exactly one group is dragged), marking an explicit
 * group drag vs. a leaf drag for the resolve/move engine.
 */
interface DragPayload {
    leafColIds: string[];
    recordIds: Set<string>;
    groupIds: string[];
    dragUnitGroupId: string | null;
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

    const dragUnitGroupId = groupIds.length === 1 ? groupIds[0] : null;
    return {leafColIds: [...leafColIds], recordIds, groupIds, dragUnitGroupId, fromLibrary};
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
