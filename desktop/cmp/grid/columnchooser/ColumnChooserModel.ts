/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {findLastIndex, isEmpty} from 'lodash';
import {useEffect, useRef} from 'react';

import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import {StoreRecord} from '@xh/hoist/data';
import {hbox, span} from '@xh/hoist/cmp/layout';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {hoistCmp, HoistModel, HoistProps, managed} from '@xh/hoist/core';
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
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';

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
 * grid's columns and provides controls for visibility toggling and drag-and-drop reordering.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    //---------------------
    // Managed Children
    //---------------------
    @managed
    chooserGridModel: GridModel;

    //---------------------
    // Observable State
    //---------------------
    /** True to display columns grouped under their column group headers. */
    @bindable showGroups: boolean = true;
    declare setShowGroups: (v: boolean) => void;

    /** Current quick-filter text. */
    @bindable filterText: string = '';

    //---------------------
    // Computed
    //---------------------
    /** Description of the currently selected column, or empty string if none selected. */
    @computed
    get selectedDescription(): string {
        const rec = this.chooserGridModel?.selectedRecord;
        return rec?.data.description ?? '';
    }

    /** True when the target grid has at least one column group. */
    @computed
    get hasColumnGroups(): boolean {
        if (!this.gridModel) return false;
        return this.gridModel.columns.some(c => c instanceof ColumnGroup);
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
     * Aggregate visibility state of all hideable leaf columns currently shown in the chooser
     * (respects the active filter). Used to drive the "toggle all" checkbox in the toolbar.
     */
    @computed
    get aggregateVisibility(): 'all' | 'none' | 'some' {
        const leaves = this.chooserGridModel.store.records.filter(
            r => !r.data.isGroup && r.data.hideable
        );
        if (isEmpty(leaves)) return 'all';

        const visibleCount = leaves.filter(r => r.data.visible).length;
        if (visibleCount === 0) return 'none';
        if (visibleCount === leaves.length) return 'all';
        return 'some';
    }

    /** ag-grid options for the internal chooser grid. */
    @computed
    get agOptions(): GridOptions {
        return {
            suppressRowDrag: !!this.filterText,
            suppressMoveWhenRowDragging: true,
            rowDragText: params => (params.rowNode?.data as any)?.data?.name ?? '',
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

    constructor() {
        super();
        makeObservable(this);

        this.chooserGridModel = new GridModel({
            treeMode: true,
            treeStyle: 'none',
            expandLevel: -1,
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'auto'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            sortBy: 'sortOrder',
            emptyText: 'No columns',
            selModel: 'single',
            hideHeaders: true,
            cellBorders: true,
            clicksToExpand: 0,
            columns: [
                {
                    field: 'name',
                    isTreeColumn: true,
                    flex: 1,
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
                    actions: [
                        {
                            icon: Icon.checkSquare(),
                            displayFn: ({record}) => {
                                if (!record.data.hideable) {
                                    return {icon: Icon.lock(), disabled: true};
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

        this.addReaction({
            track: () => this.filterText,
            run: filterText => this.applyFilter(filterText),
            debounce: 200
        });
    }

    //-----------------
    // Actions
    //-----------------
    /**
     * Toggle visibility for all hideable leaf columns currently shown (respects active filter).
     * If all are visible, hides them; otherwise shows all.
     */
    toggleAllVisibility() {
        const {gridModel} = this;
        if (!gridModel) return;

        const leaves = this.chooserGridModel.store.records.filter(
            r => !r.data.isGroup && r.data.hideable
        );
        if (isEmpty(leaves)) return;

        const shouldHide = this.aggregateVisibility === 'all';
        gridModel.updateColumnState(leaves.map(r => ({colId: r.data.id, hidden: shouldHide})));
    }

    toggleVisibility(recordId: string) {
        const {gridModel} = this;
        if (!gridModel) return;

        const record = this.chooserGridModel.store.getById(recordId);
        if (!record || !record.data.hideable) return;

        // Hide when fully or partially visible (true/null); show when fully hidden (false)
        const newHidden = record.data.visible !== false,
            {leafColIds} = record.data;

        gridModel.updateColumnState(leafColIds.map(colId => ({colId, hidden: newHidden})));
    }

    /**
     * Validate a proposed drop position during unmanaged row dragging.
     * Returns highlight/position info to control the ag-grid drop indicator line,
     * or disallows the drop entirely.
     */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        const sourceData = this.getChooserData(params.source);
        let target = params.target,
            {position} = params;

        // When the cursor is past the last row in a tree with expanded groups, ag-grid walks
        // target up to the outermost ancestor group — which makes the drop-indicator line
        // render under that group header instead of under the actual last leaf. Re-pin target
        // to the last displayed row.
        if (!params.overNode) {
            const {agApi} = this.chooserGridModel,
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
        if (sourceData.isGroup && this.isDescendantOf(targetData.id, sourceData.id)) {
            return {allowed: false};
        }

        // Enforce lockColumnGroups constraints
        if (
            this.gridModel.lockColumnGroups &&
            !this.isValidLockedDrop(sourceData, targetData, position)
        ) {
            return {allowed: false};
        }

        return {allowed: true, highlight: true, position, target};
    }

    /**
     * Handle row drag end. In unmanaged mode, ag-grid has NOT moved any rows — we compute
     * the new column order from the drop target info and push it to the target GridModel.
     */
    handleRowDragEnd(event: RowDragEndEvent) {
        const {gridModel} = this;
        if (!gridModel) return;

        const sourceData = this.getChooserData(event.node);
        if (!sourceData) return;

        // rowsDrop contains the validated position/target from getValidDropPosition
        const dropInfo = event.rowsDrop;
        if (!dropInfo || !dropInfo.allowed) return;

        const targetData = this.getChooserData(dropInfo.target);
        if (!targetData) return;

        const {position} = dropInfo;
        if (position === 'none') return;

        // 1) Collect leaf colIds being moved (works for both leaf and group drags)
        const movingIds = new Set(sourceData.leafColIds);

        // 2) Split current columnState into remaining and moving entries
        const currentState = [...gridModel.columnState],
            remaining = currentState.filter(cs => !movingIds.has(cs.colId)),
            movingState = currentState.filter(cs => movingIds.has(cs.colId));

        if (!movingState.length) return;

        // 3) Compute insertion index and splice
        const insertionIndex = this.computeInsertionIndex(remaining, targetData, position);
        remaining.splice(insertionIndex, 0, ...movingState);

        // 4) Pre-sync chooser grid so dropped row appears in final position immediately
        this.syncFromGridModel(remaining);

        // 5) Push reordered state — reaction re-syncs from authoritative state
        gridModel.updateColumnState(remaining.map(cs => ({...cs})));
    }

    async restoreDefaultsAsync() {
        await this.gridModel?.restoreDefaultsAsync();
    }

    //-----------------
    // Implementation
    //-----------------
    @action
    private syncFromGridModel(columnState?: ColumnState[]) {
        if (!this.gridModel) return;
        const data = this.buildData(columnState);
        this.loadData(data, this.showGroups);
    }

    /**
     * Build chooser records from columnState order.
     *
     * Iterates the columnState array (source of truth for display order), and for each leaf
     * column looks up its parent group chain from the column definitions. Adjacent columns
     * sharing the same group are merged under a single group node. Non-adjacent columns from
     * the same group produce separate group instances (split groups).
     *
     * Group records are created with empty leafColIds in the first pass — a second pass
     * populates them from actual children so split groups only contain their own leaves.
     */
    private buildData(
        columnState: ColumnState[] = this.gridModel.columnState
    ): ColumnChooserData[] {
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

    private loadData(data: ColumnChooserData[], showGroups: boolean) {
        const leaves = data.filter(r => !r.isGroup),
            leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            this.chooserGridModel.store.loadData(leaves);
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

        this.chooserGridModel.store.loadData(rootData);
    }

    private applyFilter(filterText: string) {
        const filter = filterText
            ? rec => {
                  const lower = filterText.toLowerCase();
                  if (!rec.data.isGroup) {
                      return rec.data.name?.toLowerCase().includes(lower);
                  }
                  return rec.data.leafColIds?.some(colId => {
                      const leaf = rec.store.getById(colId);
                      return leaf?.data.name?.toLowerCase().includes(lower);
                  });
              }
            : null;

        this.chooserGridModel.store.setFilter(filter);
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

    /** Check if a record is a descendant of a potential ancestor in the chooser tree. */
    private isDescendantOf(candidateId: string, ancestorId: string): boolean {
        const store = this.chooserGridModel.store;
        let current = store.getById(candidateId);
        while (current?.data.parentId) {
            if (current.data.parentId === ancestorId) return true;
            current = store.getById(current.data.parentId);
        }
        return false;
    }

    /**
     * Validate drop when lockColumnGroups is true.
     *
     * Simulates the proposed move and verifies that every column group's leaves remain
     * contiguous in columnState. This allows moving a group to any position where doing
     * so keeps the group structure intact — e.g. reordering sibling groups within a
     * shared parent, even when the drop target is a leaf inside one of those siblings.
     */
    private isValidLockedDrop(
        source: ColumnChooserData,
        target: ColumnChooserData,
        position: RowDropTargetPosition
    ): boolean {
        const {gridModel} = this,
            movingIds = new Set(source.leafColIds),
            currentState = [...gridModel.columnState],
            remaining = currentState.filter(cs => !movingIds.has(cs.colId)),
            movingState = currentState.filter(cs => movingIds.has(cs.colId));

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

    /** Compute insertion index for moved columns in the remaining columnState array. */
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
}

//------------------
// Cell Renderers
//------------------
interface NameCellProps extends HoistProps, ICellRendererParams<StoreRecord> {}

/** Inner renderer for the name (tree) column — grip drag handle + column name. */
const NameCell = hoistCmp<NameCellProps>(({registerRowDragger, data: record}) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) registerRowDragger(ref.current);
    }, [registerRowDragger]);

    return hbox({
        alignItems: 'center',
        items: [
            span({
                ref,
                className: 'xh-column-chooser__drag-handle',
                item: Icon.grip({prefix: 'fas'})
            }),
            record?.data.name ?? ''
        ]
    });
});
