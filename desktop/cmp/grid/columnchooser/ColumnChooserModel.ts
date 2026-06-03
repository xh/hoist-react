/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {GridContextMenuItemLike} from '@xh/hoist/cmp/grid/GridContextMenu';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import type {HSide} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import {RecordAction} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import type {
    GetContextMenuItemsParams,
    GridOptions,
    IsRowValidDropPositionParams,
    IsRowValidDropPositionResult,
    RowDragEndEvent,
    RowDropTargetPosition
} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {logWithInfo, withDefault} from '@xh/hoist/utils/js';
import {findLastIndex, isEmpty} from 'lodash';

import {ColumnChooserBucketModel} from './ColumnChooserBucketModel';

/** Shape of record data in the ColumnChooser's internal grid. */
export interface ColumnChooserData {
    id: string;
    name: string;
    description: string;
    /** true = all visible, false = none visible, null = indeterminate (mixed). */
    visible: boolean | null;
    isGroup: boolean;
    hideable: boolean;
    parentId: string;
    sortOrder: number;
    leafColIds: string[];
}

/**
 * Model for the ColumnChooser component. Manages an internal representation of the target
 * grid's columns - split across three buckets by pinned state (left, none, right) - and
 * provides controls for visibility toggling, pinning, and drag-and-drop reordering both
 * within and across buckets.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    //---------------------
    // Managed Children
    //---------------------
    @managed leftBucket: ColumnChooserBucketModel;
    @managed unpinnedBucket: ColumnChooserBucketModel;
    @managed rightBucket: ColumnChooserBucketModel;

    //---------------------
    // Observable State
    //---------------------
    /** True to display columns grouped under their column group headers. */
    @bindable showGroups: boolean = true;
    declare setShowGroups: (v: boolean) => void;

    //---------------------
    // Computed
    //---------------------
    get buckets(): ColumnChooserBucketModel[] {
        return [this.leftBucket, this.unpinnedBucket, this.rightBucket];
    }

    /** Description of the currently selected column (across any bucket), or empty string. */
    @computed
    get selectedDescription(): string {
        for (const b of this.buckets) {
            const desc = b.selectedData?.description;
            if (desc) return desc;
        }
        return '';
    }

    /** True when the target grid has at least one column group. */
    @computed
    get hasColumnGroups(): boolean {
        if (!this.gridModel) return false;
        return this.gridModel.columns.some(c => c instanceof ColumnGroup);
    }

    /** True when the target grid allows column pinning - gates display of the pinned buckets. */
    @computed
    get enableColumnPinning(): boolean {
        return this.gridModel?.enableColumnPinning ?? false;
    }

    /** The GridModel whose columns this chooser manages. */
    @computed
    get gridModel(): GridModel {
        const ret = withDefault(this.componentProps?.gridModel, this.lookupModel(GridModel));
        if (!ret) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        }
        return ret;
    }

    /**
     * Aggregate visibility state of all hideable leaf columns currently shown across all
     * buckets (respects the active filter). Drives the "toggle all" checkbox in the toolbar.
     */
    @computed
    get aggregateVisibility(): 'all' | 'none' | 'some' {
        const leaves = this.buckets.flatMap(b => b.hideableLeafRecords);
        if (isEmpty(leaves)) return 'all';

        const visibleCount = leaves.filter(r => r.data.visible).length;
        if (visibleCount === 0) return 'none';
        if (visibleCount === leaves.length) return 'all';
        return 'some';
    }

    constructor() {
        super();
        makeObservable(this);

        this.leftBucket = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'left',
            summaryName: 'Left Pinned',
            emptyText: 'Drop a column here to pin left'
        });
        this.unpinnedBucket = new ColumnChooserBucketModel({
            parent: this,
            pinned: null,
            summaryName: 'Unpinned',
            emptyText: 'No columns'
        });
        this.rightBucket = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'right',
            summaryName: 'Right Pinned',
            emptyText: 'Drop a column here to pin right'
        });
    }

    //-----------------
    // Lifecycle
    //-----------------
    override onLinked() {
        this.addReaction({
            track: () => [this.gridModel?.columnState, this.gridModel?.columns],
            run: () => this.syncFromGridModel(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => this.showGroups,
            run: () => this.syncFromGridModel()
        });

        // Wire cross-bucket drag-and-drop once all three bucket grids have an ag api.
        this.addReaction({
            track: () => this.buckets.map(b => b.chooserGridModel.agApi),
            run: apis => {
                if (!this.dropZonesInstalled && apis.every(a => !!a)) {
                    this.installCrossBucketDropZones();
                    this.dropZonesInstalled = true;
                }
            }
        });
    }

    //-----------------
    // Actions
    //-----------------
    /**
     * Toggle visibility for all hideable leaf columns currently shown across all buckets
     * (respects active filter). If all are visible, hides them; otherwise shows all.
     */
    toggleAllVisibility() {
        const {gridModel} = this;
        if (!gridModel) return;

        const leaves = this.buckets.flatMap(b => b.hideableLeafRecords);
        if (isEmpty(leaves)) return;

        const shouldHide = this.aggregateVisibility === 'all';
        gridModel.updateColumnState(leaves.map(r => ({colId: r.data.id, hidden: shouldHide})));
    }

    @logWithInfo
    toggleVisibility(recordId: string, bucket: ColumnChooserBucketModel) {
        const {gridModel} = this;
        if (!gridModel) return;

        const record = bucket.chooserGridModel.store.getById(recordId);
        if (!record || !record.data.hideable) return;

        // Hide when fully or partially visible (true/null); show when fully hidden (false)
        const newHidden = record.data.visible !== false,
            {leafColIds} = record.data;

        gridModel.updateColumnState(leafColIds.map(colId => ({colId, hidden: newHidden})));
    }

    /**
     * Update the pinned state for a set of leaf colIds. Pinned columns are normalized to
     * the end of the target bucket's slice; unpinned columns go to the end of the unpinned
     * bucket.
     */
    setPinned(leafColIds: string[], pinned: HSide | null) {
        const {gridModel} = this;
        if (!gridModel || isEmpty(leafColIds)) return;

        const movingIds = new Set(leafColIds),
            currentState = gridModel.columnState,
            slices = this.bucketSlices(currentState, movingIds),
            movingState = currentState
                .filter(cs => movingIds.has(cs.colId))
                .map(cs => ({...cs, pinned}));

        const targetSlice = this.sliceForPinned(slices, pinned);
        targetSlice.push(...movingState);

        this.commitState(slices);
    }

    /**
     * Validate a proposed drop position during unmanaged row dragging within a single bucket.
     */
    getValidDropPosition(
        params: IsRowValidDropPositionParams,
        bucket: ColumnChooserBucketModel
    ): IsRowValidDropPositionResult {
        const sourceData = this.getChooserData(params.source);
        let target = params.target,
            {position} = params;

        // When the cursor is past the last row in a tree with expanded groups, ag-grid walks
        // target up to the outermost ancestor group — which makes the drop-indicator line
        // render under that group header instead of under the actual last leaf. Re-pin target
        // to the last displayed row.
        if (!params.overNode) {
            const {agApi} = bucket.chooserGridModel,
                lastIdx = (agApi?.getDisplayedRowCount() ?? 0) - 1,
                lastRow = lastIdx >= 0 ? agApi?.getDisplayedRowAtIndex(lastIdx) : null;
            if (lastRow) {
                target = lastRow;
                position = 'below';
            }
        }

        const targetData = this.getChooserData(target);
        if (!sourceData || !targetData) return {allowed: false};
        if (sourceData.id === targetData.id) return {allowed: false};

        // Can't drop "inside" a leaf — treat as "below"
        if (position === 'inside' && !targetData.isGroup) {
            position = 'below';
        }

        // Prevent dropping a group inside itself
        if (sourceData.isGroup && this.isDescendantOf(targetData.id, sourceData.id, bucket)) {
            return {allowed: false};
        }

        // Enforce lockColumnGroups constraints within this bucket
        if (
            this.gridModel.lockColumnGroups &&
            !this.isValidLockedDrop(sourceData, targetData, position, bucket)
        ) {
            return {allowed: false};
        }

        return {allowed: true, highlight: true, position, target};
    }

    /** Handle intra-bucket drag end. */
    handleRowDragEnd(event: RowDragEndEvent, bucket: ColumnChooserBucketModel) {
        const sourceData = this.getChooserData(event.node);
        if (!sourceData) return;

        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed) return;

        const targetData = this.getChooserData(dropInfo.target);
        if (!targetData) return;

        const {position} = dropInfo;
        if (position === 'none') return;

        this.reorderWithinBucket(bucket, sourceData, targetData, position);
    }

    /** Handle cross-bucket drag end via an ag-grid row drop zone. */
    handleCrossBucketDrop(
        event: RowDragEndEvent,
        sourceBucket: ColumnChooserBucketModel,
        targetBucket: ColumnChooserBucketModel
    ) {
        if (sourceBucket === targetBucket) return;

        const sourceData = this.getChooserData(event.node);
        if (!sourceData) return;

        const {target, position} = this.resolveCrossBucketDropTarget(event, targetBucket);
        this.moveAcrossBuckets(targetBucket, sourceData, target, position);
    }

    async restoreDefaultsAsync() {
        await this.gridModel?.restoreDefaultsAsync();
    }

    /**
     * Build `agOptions` for one bucket grid - keeps drag/drop validators routed back through
     * the orchestrator so per-bucket grids share identical behavior with bucket-aware state.
     */
    buildAgOptions(bucket: ColumnChooserBucketModel): GridOptions {
        return {
            suppressMoveWhenRowDragging: true,
            suppressGroupRowsSticky: true,
            rowDragText: params => (params.rowNode?.data as any)?.data?.name ?? '',
            isRowValidDropPosition: params => bucket.getValidDropPosition(params),
            onRowDragEnd: event => bucket.handleRowDragEnd(event),
            onCellDoubleClicked: event => {
                // Only toggle from the name column, and not from the tree expand/collapse caret
                if (event.column?.getColId() !== 'name') return;
                const target = event.event?.target as HTMLElement;
                if (target?.closest('.ag-group-expanded, .ag-group-contracted')) return;

                const id = event.data?.data?.id;
                if (id) this.toggleVisibility(id, bucket);
            }
        };
    }

    /** Build context-menu items for a row in a given bucket. */
    buildContextMenuItems(
        agParams: GetContextMenuItemsParams,
        _gridModel: GridModel,
        bucket: ColumnChooserBucketModel
    ): GridContextMenuItemLike[] {
        const data = agParams.node?.data?.data as ColumnChooserData | undefined;
        if (!data) return [];

        const {leafColIds} = data;
        const items: GridContextMenuItemLike[] = [];

        if (bucket.pinned !== 'left') {
            items.push(
                new RecordAction({
                    text: 'Pin Left',
                    icon: Icon.pin(),
                    actionFn: () => this.setPinned(leafColIds, 'left')
                })
            );
        }
        if (bucket.pinned !== 'right') {
            items.push(
                new RecordAction({
                    text: 'Pin Right',
                    icon: Icon.pin(),
                    actionFn: () => this.setPinned(leafColIds, 'right')
                })
            );
        }
        if (bucket.pinned != null) {
            items.push(
                new RecordAction({
                    text: 'Unpin',
                    icon: Icon.x(),
                    actionFn: () => this.setPinned(leafColIds, null)
                })
            );
        }
        return items;
    }

    /** When a bucket gains a selection, clear selection on the other buckets. */
    notifyBucketSelected(activeBucket: ColumnChooserBucketModel) {
        for (const b of this.buckets) {
            if (b !== activeBucket) b.clearSelection();
        }
    }

    //-----------------
    // Implementation
    //-----------------
    @logWithInfo
    @action
    private syncFromGridModel(columnState?: ColumnState[]) {
        if (!this.gridModel) return;
        const cs = columnState ?? this.gridModel.columnState;
        for (const bucket of this.buckets) {
            const slice = cs.filter(c => (c.pinned ?? null) === bucket.pinned);
            const data = this.buildData(slice);
            const summary = this.buildBucketSummary(bucket, slice);
            this.loadBucketData(bucket, data, summary, this.showGroups);
        }
    }

    /**
     * Build the docked summary header record for a bucket. Its `name` labels the bucket and its
     * `visible` field is the bucket-scoped aggregate visibility (true/false/null). Toggling it
     * applies to all hideable leaf columns in the bucket via {@link toggleVisibility}.
     */
    private buildBucketSummary(
        bucket: ColumnChooserBucketModel,
        slice: ColumnState[]
    ): ColumnChooserData {
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
            id: `summary-${bucket.pinned ?? 'none'}`,
            name: bucket.summaryName,
            description: '',
            visible,
            isGroup: false,
            hideable: total > 0,
            parentId: null,
            sortOrder: -1,
            leafColIds: hideableLeaves.map(cs => cs.colId)
        };
    }

    /**
     * Build chooser records from a slice of columnState (one bucket's worth, in display order).
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
            stateById = new Map(columnState.map(cs => [cs.colId, cs]));

        // Build a map of colId -> parent group chain (outermost to innermost)
        const parentChainMap = new Map<string, ColumnGroup[]>();
        const buildParentChains = (cols: ColumnOrGroup[], ancestors: ColumnGroup[]) => {
            for (const col of cols) {
                if (col instanceof ColumnGroup) {
                    buildParentChains(col.children, [...ancestors, col]);
                } else {
                    parentChainMap.set(col.colId, ancestors);
                }
            }
        };
        buildParentChains(gridModel.columns, []);

        // 1) Walk columnState in order, creating leaf and group records
        const records: ColumnChooserData[] = [],
            groupInstanceCounts = new Map<string, number>(),
            activeGroups: (string | null)[] = [];

        for (let i = 0; i < columnState.length; i++) {
            const cs = columnState[i],
                col = gridModel.findColumn(gridModel.columns, cs.colId);
            if (!col || col.excludeFromChooser) continue;

            const chain = parentChainMap.get(cs.colId) ?? [];

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
                        d > 0 ? this.getActiveGroupId(chain, d - 1, groupInstanceCounts) : null;

                records.push({
                    id: instanceId,
                    name: typeof group.headerName === 'string' ? group.headerName : group.groupId,
                    description: '',
                    visible: false,
                    isGroup: true,
                    hideable: false,
                    parentId: parentInstanceId,
                    sortOrder: i,
                    leafColIds: []
                });

                activeGroups[d] = group.groupId;
            }

            // Add the leaf column record
            const parentInstanceId =
                chain.length > 0
                    ? this.getActiveGroupId(chain, chain.length - 1, groupInstanceCounts)
                    : null;

            records.push({
                id: cs.colId,
                name: col.chooserName,
                description: col.chooserDescription ?? '',
                visible: !cs.hidden,
                isGroup: false,
                hideable: col.hideable,
                parentId: parentInstanceId,
                sortOrder: i,
                leafColIds: [cs.colId]
            });
        }

        // 2) Populate group leafColIds and derive visibility from actual children
        const recordMap = new Map(records.map(r => [r.id, r]));
        for (const rec of records) {
            if (!rec.isGroup) continue;
            rec.leafColIds = this.collectLeafColIds(rec, recordMap);

            const hiddenCount = rec.leafColIds.filter(id => stateById.get(id)?.hidden).length;
            const total = rec.leafColIds.length;
            rec.visible = hiddenCount === 0 ? true : hiddenCount === total ? false : null;
            rec.hideable = rec.leafColIds.some(id => {
                return gridModel.findColumn(gridModel.columns, id)?.hideable;
            });
        }

        return records;
    }

    private getActiveGroupId(
        chain: ColumnGroup[],
        depth: number,
        groupInstanceCounts: Map<string, number>
    ): string {
        const groupId = chain[depth].groupId,
            count = groupInstanceCounts.get(groupId) ?? 1;
        return count > 1 ? `${groupId}_${count}` : groupId;
    }

    private loadBucketData(
        bucket: ColumnChooserBucketModel,
        data: ColumnChooserData[],
        summary: ColumnChooserData,
        showGroups: boolean
    ) {
        const leaves = data.filter(r => !r.isGroup),
            leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            bucket.chooserGridModel.store.loadData(leaves, summary);
            return;
        }

        // Tree mode: build nested structure with groups as parents
        const groups = data.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id))),
            groupIdSet = new Set(groups.map(r => r.id));

        const childrenMap = new Map<string, ColumnChooserData[]>();
        for (const rec of [...groups, ...leaves]) {
            if (rec.parentId && groupIdSet.has(rec.parentId)) {
                if (!childrenMap.has(rec.parentId)) childrenMap.set(rec.parentId, []);
                childrenMap.get(rec.parentId).push(rec);
            }
        }

        const buildNested = (r: ColumnChooserData): object => {
            const children = childrenMap.get(r.id);
            return children ? {...r, children: children.map(buildNested)} : {...r};
        };

        const rootGroups = groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootLeaves = leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId)),
            rootData = [...rootGroups, ...rootLeaves].map(buildNested);

        bucket.chooserGridModel.store.loadData(rootData, summary);
    }

    /** Extract ColumnChooserData from an ag-grid IRowNode (whose data is a StoreRecord). */
    private getChooserData(node: any): ColumnChooserData | null {
        return node?.data?.data ?? null;
    }

    /** Recursively collect leaf colIds for a group from its actual children in the record set. */
    private collectLeafColIds(
        group: ColumnChooserData,
        recordMap: Map<string, ColumnChooserData>
    ): string[] {
        const ids: string[] = [];
        for (const rec of recordMap.values()) {
            if (rec.parentId !== group.id) continue;
            if (rec.isGroup) {
                ids.push(...this.collectLeafColIds(rec, recordMap));
            } else {
                ids.push(rec.id);
            }
        }
        return ids;
    }

    /** Check if a record is a descendant of a potential ancestor in the bucket's chooser tree. */
    private isDescendantOf(
        candidateId: string,
        ancestorId: string,
        bucket: ColumnChooserBucketModel
    ): boolean {
        const store = bucket.chooserGridModel.store;
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
     * Simulates the proposed move within the bucket and verifies that every column group's
     * leaves remain contiguous. Cross-bucket drops bypass this check per spec.
     */
    private isValidLockedDrop(
        source: ColumnChooserData,
        target: ColumnChooserData,
        position: RowDropTargetPosition,
        bucket: ColumnChooserBucketModel
    ): boolean {
        const movingIds = new Set(source.leafColIds),
            bucketSlice = this.gridModel.columnState.filter(
                cs => (cs.pinned ?? null) === bucket.pinned
            ),
            remaining = bucketSlice.filter(cs => !movingIds.has(cs.colId)),
            movingState = bucketSlice.filter(cs => movingIds.has(cs.colId));

        const insertionIndex = this.computeInsertionIndex(remaining, target, position),
            simulated = [...remaining];
        simulated.splice(insertionIndex, 0, ...movingState);

        return this.areGroupsContiguous(simulated);
    }

    /** True if every column group's leaves form a contiguous range in the given state. */
    private areGroupsContiguous(state: {colId: string}[]): boolean {
        const {gridModel} = this,
            parentChainMap = new Map<string, ColumnGroup[]>();

        const buildParentChains = (cols: ColumnOrGroup[], ancestors: ColumnGroup[]) => {
            for (const col of cols) {
                if (col instanceof ColumnGroup) {
                    buildParentChains(col.children, [...ancestors, col]);
                } else {
                    parentChainMap.set(col.colId, ancestors);
                }
            }
        };
        buildParentChains(gridModel.columns, []);

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

    /** Compute insertion index for moved columns within a bucket's slice. */
    private computeInsertionIndex(
        remaining: {colId: string}[],
        targetData: ColumnChooserData,
        position: RowDropTargetPosition
    ): number {
        const targetLeafIds = new Set(targetData.leafColIds);

        if (targetData.isGroup) {
            const firstIdx = remaining.findIndex(cs => targetLeafIds.has(cs.colId)),
                lastIdx = findLastIndex(remaining, cs => targetLeafIds.has(cs.colId));

            if (firstIdx === -1) return remaining.length;
            if (position === 'above') return firstIdx;
            return lastIdx + 1;
        }

        const targetIdx = remaining.findIndex(cs => cs.colId === targetData.id);
        if (targetIdx === -1) return remaining.length;
        return position === 'above' ? targetIdx : targetIdx + 1;
    }

    //-----------------
    // Cross-bucket drag plumbing
    //-----------------
    private dropZonesInstalled = false;

    private installCrossBucketDropZones() {
        for (const source of this.buckets) {
            const sourceApi = source.chooserGridModel.agApi;
            if (!sourceApi) continue;
            for (const target of this.buckets) {
                if (target === source) continue;
                const targetApi = target.chooserGridModel.agApi;
                if (!targetApi) continue;
                const params = targetApi.getRowDropZoneParams({
                    onDragStop: e => target.handleCrossBucketDrop(e, source)
                });
                if (params) sourceApi.addRowDropZone(params);
            }
        }
    }

    /**
     * Reorder columns within a single bucket - moving columns are spliced into their new
     * position in this bucket's slice, the other buckets remain untouched, and the resulting
     * normalized full state is pushed to the target GridModel.
     */
    private reorderWithinBucket(
        bucket: ColumnChooserBucketModel,
        sourceData: ColumnChooserData,
        targetData: ColumnChooserData,
        position: RowDropTargetPosition
    ) {
        const {gridModel} = this;
        if (!gridModel) return;

        const movingIds = new Set(sourceData.leafColIds),
            slices = this.bucketSlices(gridModel.columnState, movingIds),
            movingState = gridModel.columnState.filter(cs => movingIds.has(cs.colId));

        if (!movingState.length) return;

        const targetSlice = this.sliceForPinned(slices, bucket.pinned),
            insertionIndex = this.computeInsertionIndex(targetSlice, targetData, position);

        targetSlice.splice(insertionIndex, 0, ...movingState);

        this.commitState(slices);
    }

    /**
     * Move columns from one bucket into another. Updates `pinned` on the moving leaves and
     * splices them into the target bucket's slice at the resolved drop position.
     */
    private moveAcrossBuckets(
        targetBucket: ColumnChooserBucketModel,
        sourceData: ColumnChooserData,
        targetData: ColumnChooserData | null,
        position: RowDropTargetPosition
    ) {
        const {gridModel} = this;
        if (!gridModel) return;

        const movingIds = new Set(sourceData.leafColIds),
            slices = this.bucketSlices(gridModel.columnState, movingIds),
            movingState = gridModel.columnState
                .filter(cs => movingIds.has(cs.colId))
                .map(cs => ({...cs, pinned: targetBucket.pinned}));

        if (!movingState.length) return;

        const targetSlice = this.sliceForPinned(slices, targetBucket.pinned);
        const insertionIndex = targetData
            ? this.computeInsertionIndex(targetSlice, targetData, position)
            : targetSlice.length;

        targetSlice.splice(insertionIndex, 0, ...movingState);

        this.commitState(slices);
    }

    /** Build per-bucket slices, optionally excluding a set of moving colIds. */
    private bucketSlices(state: ColumnState[], excludeIds?: Set<string>) {
        const filterFn = (cs: ColumnState) => !excludeIds?.has(cs.colId);
        return {
            left: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === 'left'),
            none: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === null),
            right: state.filter(cs => filterFn(cs) && (cs.pinned ?? null) === 'right')
        };
    }

    private sliceForPinned(
        slices: {left: ColumnState[]; none: ColumnState[]; right: ColumnState[]},
        pinned: HSide | null
    ): ColumnState[] {
        if (pinned === 'left') return slices.left;
        if (pinned === 'right') return slices.right;
        return slices.none;
    }

    /** Normalize and commit slices to the target GridModel; pre-sync local chooser stores. */
    @action
    private commitState(slices: {left: ColumnState[]; none: ColumnState[]; right: ColumnState[]}) {
        const newState = [...slices.left, ...slices.none, ...slices.right];
        // Pre-sync so dropped rows appear in final position immediately, before the reaction.
        this.syncFromGridModel(newState);
        this.gridModel.setColumnState(newState);
    }

    /**
     * Resolve the drop target inside `targetBucket` from a cross-grid drag event. Falls back
     * to "append to end" when the cursor isn't over a row (e.g. empty bucket or below last).
     */
    private resolveCrossBucketDropTarget(
        event: RowDragEndEvent,
        targetBucket: ColumnChooserBucketModel
    ): {target: ColumnChooserData | null; position: RowDropTargetPosition} {
        const {overNode} = event;
        if (overNode) {
            const targetData = this.getChooserData(overNode);
            if (targetData) {
                // Above/below heuristic from the cursor's y vs. the row's midpoint.
                const rowTop = overNode.rowTop ?? 0,
                    rowHeight = overNode.rowHeight ?? 0,
                    midpoint = rowTop + rowHeight / 2,
                    position: RowDropTargetPosition = event.y < midpoint ? 'above' : 'below';
                return {target: targetData, position};
            }
        }

        // Fall back to the last displayed row in the target bucket (append).
        const {agApi} = targetBucket.chooserGridModel;
        const lastIdx = (agApi?.getDisplayedRowCount() ?? 0) - 1;
        if (lastIdx >= 0) {
            const lastRow = agApi?.getDisplayedRowAtIndex(lastIdx),
                targetData = this.getChooserData(lastRow);
            if (targetData) return {target: targetData, position: 'below'};
        }
        return {target: null, position: 'below'};
    }
}
