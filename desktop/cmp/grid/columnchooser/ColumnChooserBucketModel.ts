/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {hbox, span} from '@xh/hoist/cmp/layout';
import type {HSide, Some} from '@xh/hoist/core';
import {hoistCmp, HoistModel, HoistProps, managed} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import type {
    GridOptions,
    ICellRendererParams,
    IsRowValidDropPositionParams,
    IsRowValidDropPositionResult,
    RowDragEndEvent,
    RowDropTargetPosition
} from '@xh/hoist/kit/ag-grid';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {castArray, findLastIndex, isEmpty} from 'lodash';
import {useEffect, useRef} from 'react';

import type {ColumnChooserModel} from './ColumnChooserModel';

/** Shape of record data in the ColumnChooser's internal grid. */
export interface ColumnChooserData {
    id: string;
    name: string;
    description: string;
    /** true = all visible, false = none visible, null = indeterminate (mixed). */
    visible: boolean | null;
    isGroup: boolean;
    hideable: boolean;
    movable: boolean;
    parentId: string;
    sortOrder: number;
    leafColIds: string[];
}

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
export class ColumnChooserBucketModel extends HoistModel {
    override xhImpl = true;

    readonly parent: ColumnChooserModel;
    readonly pinned: HSide | null;
    readonly summaryName: string;

    @managed
    chooserGridModel: GridModel;

    /** The target GridModel whose columns this bucket manages. */
    get gridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            suppressMoveWhenRowDragging: true,
            suppressGroupRowsSticky: true,
            rowDragText: params => getChooserData(params.rowNode)?.name ?? '',
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

    /** Rebuild this bucket's chooser records from the given (full) columnState. */
    syncFromState(columnState: ColumnState[], showGroups: boolean) {
        const slice = columnState.filter(cs => (cs.pinned ?? null) === this.pinned);
        this.loadData(this.buildData(slice), this.buildSummary(slice), showGroups);
    }

    toggleVisibility(recordIds: Some<StoreRecordId>) {
        const {gridModel} = this;
        if (!gridModel) return;

        const {store} = this.chooserGridModel,
            updates: Partial<ColumnState>[] = [];

        castArray(recordIds).forEach(id => {
            const record = store.getById(id);
            if (!record || !record.data.hideable) return;

            // Hide when fully or partially visible (true/null); show when fully hidden (false)
            const hidden = record.data.visible !== false;
            record.data.leafColIds.forEach(colId => updates.push({colId, hidden}));
        });

        gridModel.updateColumnState(updates);
    }

    /**
     * Validate a proposed drop position during unmanaged row dragging within this bucket.
     */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        const sourceData = getChooserData(params.source);
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
        if (!sourceData || !targetData) return {allowed: false};
        if (sourceData.id === targetData.id) return {allowed: false};

        // Can't drop "inside" a leaf — treat as "below"
        if (position === 'inside' && !targetData.isGroup) {
            position = 'below';
        }

        // Prevent dropping a group inside itself
        if (sourceData.isGroup && this.isDescendantOf(targetData.id, sourceData.id)) {
            return {allowed: false};
        }

        // Enforce lockColumnGroups constraints within this bucket
        if (
            this.gridModel.lockColumnGroups &&
            !this.isValidLockedDrop(sourceData, targetData, position)
        ) {
            return {allowed: false};
        }

        // Suppress the indicator when the drop would leave the order unchanged.
        if (this.isNoOpMove(sourceData, targetData, position)) {
            return {allowed: false};
        }

        // Pin the indicator to a single canonical row by mapping the real insertion point to the
        // row that will follow it (see getDropHighlight). This removes the ~1px above/below flicker
        // between adjacent rows and ensures a drop landing before a group renders above the group
        // header, not above its first child (the dropped column lands before the group in the tree).
        return this.getDropHighlight(sourceData, targetData, position, target);
    }

    /** Handle intra-bucket drag end. */
    handleRowDragEnd(event: RowDragEndEvent) {
        const sourceData = getChooserData(event.node);
        if (!sourceData) return;

        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed) return;

        const targetData = getChooserData(dropInfo.target);
        if (!targetData) return;

        const {position} = dropInfo;
        if (position === 'none') return;

        this.moveColumns(sourceData, targetData, position);
    }

    /** Handle a drop into this bucket from another bucket, via an ag-grid row drop zone. */
    handleCrossBucketDrop(event: RowDragEndEvent, sourceBucket: ColumnChooserBucketModel) {
        if (sourceBucket === this) return;

        const sourceData = getChooserData(event.node);
        if (!sourceData) return;

        const {target, position} = this.resolveDropTarget(event);
        this.moveColumns(sourceData, target, position);
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
        const {gridModel} = this,
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
        const {gridModel} = this,
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

            const hiddenCount = it.leafColIds.filter(id => stateById.get(id)?.hidden).length;
            it.visible =
                hiddenCount === 0 ? true : hiddenCount === it.leafColIds.length ? false : null;

            it.hideable = it.leafColIds.some(id => {
                return gridModel.getColumn(id)?.hideable;
            });

            it.movable = it.leafColIds.every(id => {
                return gridModel.getColumn(id)?.movable;
            });
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
     * Validate drop when lockColumnGroups is true (intra-bucket only).
     *
     * Simulates the proposed move within this bucket and verifies that every column group's
     * leaves remain contiguous. Cross-bucket drops bypass this check per spec.
     */
    private isValidLockedDrop(
        source: ColumnChooserData,
        target: ColumnChooserData,
        position: RowDropTargetPosition
    ): boolean {
        const movingIds = new Set(source.leafColIds),
            bucketSlice = this.gridModel.columnState.filter(
                cs => (cs.pinned ?? null) === this.pinned
            ),
            remaining = bucketSlice.filter(cs => !movingIds.has(cs.colId)),
            movingState = bucketSlice.filter(cs => movingIds.has(cs.colId));

        const insertionIndex = computeInsertionIndex(bucketSlice, movingIds, target, position),
            simulated = [...remaining];
        simulated.splice(insertionIndex, 0, ...movingState);

        return areGroupsContiguous(simulated, buildParentChainMap(this.gridModel.columns));
    }

    /**
     * Move columns into this bucket at the given drop position - from elsewhere in this bucket
     * or from another bucket. Updates `pinned` on the moving leaves, splices them into this
     * bucket's slice, and commits the resulting normalized full state via the parent.
     */
    private moveColumns(
        sourceData: ColumnChooserData,
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition
    ) {
        const {gridModel} = this;
        if (!gridModel) return;

        const movingIds = new Set(sourceData.leafColIds),
            slices = partitionByPinned(gridModel.columnState, movingIds),
            fullSlice = gridModel.columnState.filter(cs => (cs.pinned ?? null) === this.pinned),
            movingState = gridModel.columnState
                .filter(cs => movingIds.has(cs.colId))
                .map(cs => ({...cs, pinned: this.pinned}));

        if (!movingState.length) return;

        const targetSlice = slices[this.pinned ?? 'none'],
            insertionIndex = targetData
                ? computeInsertionIndex(fullSlice, movingIds, targetData, position)
                : targetSlice.length;

        targetSlice.splice(insertionIndex, 0, ...movingState);

        this.parent.commit([...slices.left, ...slices.none, ...slices.right]);
    }

    /**
     * Resolve the drop target in this bucket from a cross-grid drag event. Falls back to
     * "append to end" when the cursor isn't over a row (e.g. empty bucket or below last).
     */
    private resolveDropTarget(event: RowDragEndEvent): {
        target: ColumnChooserData | null;
        position: RowDropTargetPosition;
    } {
        const {overNode} = event;
        if (overNode) {
            const targetData = getChooserData(overNode);
            if (targetData) {
                // Above/below heuristic from the cursor's y vs. the row's midpoint.
                const rowTop = overNode.rowTop ?? 0,
                    rowHeight = overNode.rowHeight ?? 0,
                    midpoint = rowTop + rowHeight / 2,
                    position: RowDropTargetPosition = event.y < midpoint ? 'above' : 'below';
                return {target: targetData, position};
            }
        }

        // Fall back to the last displayed row in this bucket (append).
        const targetData = getChooserData(this.getLastDisplayedRow());
        return targetData
            ? {target: targetData, position: 'below'}
            : {target: null, position: 'below'};
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
        sourceData: ColumnChooserData,
        targetData: ColumnChooserData,
        position: RowDropTargetPosition
    ): boolean {
        const movingIds = new Set(sourceData.leafColIds),
            slice = this.gridModel.columnState.filter(cs => (cs.pinned ?? null) === this.pinned),
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
        sourceData: ColumnChooserData,
        targetData: ColumnChooserData,
        position: RowDropTargetPosition,
        fallbackTarget: any
    ): IsRowValidDropPositionResult {
        const {agApi} = this.chooserGridModel,
            movingIds = new Set(sourceData.leafColIds),
            slice = this.gridModel.columnState.filter(cs => (cs.pinned ?? null) === this.pinned),
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

        const followingRec = this.getGroupBoundaryRecord(remaining[insertIdx].colId, movingIds),
            node = followingRec ? agApi?.getRowNode(followingRec.agId) : null;
        return node
            ? {allowed: true, highlight: true, position: 'above', target: node}
            : {allowed: true, highlight: true, position, target: fallbackTarget};
    }

    /**
     * Resolve the row to highlight 'above' for an insertion that precedes the given column. Climbs
     * to the outermost enclosing group whose first leaf is this column (a true group boundary);
     * otherwise returns the column's own record (a position within a group). Stops short of any
     * group the dragged column belongs to - it stays inside that group, so the indicator should sit
     * above its first child, not above the group header.
     */
    private getGroupBoundaryRecord(colId: StoreRecordId, movingIds: Set<string>): StoreRecord {
        const {store} = this.chooserGridModel;
        let rec = store.getById(colId);
        while (rec?.data.parentId) {
            const parent = store.getById(rec.data.parentId);
            if (!parent || parent.data.leafColIds[0] !== colId) break;
            if (parent.data.leafColIds.some((id: string) => movingIds.has(id))) break;
            rec = parent;
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
                            innerRenderer: NameCell
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

/** Extract ColumnChooserData from an ag-grid IRowNode (whose data is a StoreRecord). */
function getChooserData(node: any): ColumnChooserData | null {
    return node?.data?.data ?? null;
}

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

/** True if every column group's leaves form a contiguous range in the given state. */
function areGroupsContiguous(
    state: {colId: string}[],
    parentChainMap: Map<string, ColumnGroup[]>
): boolean {
    // Track each group's last-seen leaf index; if we see a non-consecutive jump, it's split
    const lastIdx = new Map<string, number>(),
        closed = new Set<string>();

    for (let i = 0; i < state.length; i++) {
        const chain = parentChainMap.get(state[i].colId);
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

//------------------
// Cell Renderers
//------------------

interface NameCellProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/** Inner renderer for the name (tree) column - grip drag handle + column name. */
export const NameCell = hoistCmp<NameCellProps>(({registerRowDragger, data: record}) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) registerRowDragger(ref.current);
    }, [registerRowDragger]);

    // Summary header rows show a styled label only - no drag handle.
    if (record?.isSummary) {
        return span({
            className: 'xh-column-chooser__summary-name',
            item: record.data.name ?? ''
        });
    }

    const movable = record?.data?.movable !== false;
    return hbox({
        alignItems: 'center',
        items: [
            movable
                ? span({
                      ref,
                      className: 'xh-column-chooser__name-cell__drag-handle',
                      item: Icon.grip({prefix: 'fas'})
                  })
                : span({
                      className: 'xh-column-chooser__name-cell__lock',
                      item: Icon.lock()
                  }),
            tooltip({
                item: span({
                    className: 'xh-column-chooser__name-cell__name',
                    item: record?.data?.name ?? ''
                }),
                content: record?.data?.description,
                minimal: true,
                disabled: isEmpty(record?.data?.description)
            })
        ]
    });
});
