import {GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import type {
    IsRowValidDropPositionParams,
    IsRowValidDropPositionResult,
    RowDragEndEvent,
    RowDropTargetPosition
} from '@xh/hoist/kit/ag-grid';
import {withDefault} from '@xh/hoist/utils/js';

/** Shape of record data in the ColumnChooser's internal grid. */
export interface ColumnChooserData {
    id: string;
    name: string;
    description: string;
    visible: boolean;
    /** True for groups where some (but not all) leaf children are visible. */
    indeterminate: boolean;
    isGroup: boolean;
    hideable: boolean;
    parentId: string;
    sortOrder: number;
    leafColIds: string[];
}

/**
 * Model for the new ColumnChooser component. Manages an internal representation of the target
 * grid's columns and provides controls for visibility toggling, reordering, and pin management.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    /** True to display columns grouped under their column group headers. */
    @bindable showGroups: boolean = true;
    declare setShowGroups: (v: boolean) => void;

    /** Current quick-filter text. */
    @bindable filterText: string = '';

    /** Internal grid displaying the column list. */
    @managed
    chooserGridModel: GridModel;

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
                    {name: 'visible', type: 'bool'},
                    {name: 'indeterminate', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            emptyText: 'No columns',
            selModel: 'single',
            hideHeaders: true,
            columns: [
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
                                if (record.data.indeterminate) {
                                    return {icon: Icon.squareMinus()};
                                }
                                return record.data.visible
                                    ? {icon: Icon.checkSquare(), intent: 'primary'}
                                    : {icon: Icon.square(), intent: null};
                            },
                            actionFn: ({record}) => this.toggleVisibility(record.data.id)
                        }
                    ]
                },
                {
                    colId: 'drag',
                    headerName: '',
                    width: 28,
                    sortable: false,
                    resizable: false,
                    renderer: () => null,
                    agOptions: {
                        rowDrag: params => !this.filterText
                    }
                },
                {
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1,
                    isTreeColumn: true,
                    renderer: (v, {record}) => record.data.name
                }
            ]
        });
    }

    override onLinked() {
        // React to changes in the target grid's column state
        this.addReaction({
            track: () => [this.gridModel?.columnState, this.gridModel?.columns],
            run: () => this.syncFromGridModel(),
            fireImmediately: true
        });

        // Re-sync when tree/flat mode toggled
        this.addReaction({
            track: () => this.showGroups,
            run: () => this.syncFromGridModel()
        });

        // Apply quick-filter when filterText changes
        this.addReaction({
            track: () => this.filterText,
            run: filterText => this.applyFilter(filterText),
            debounce: 200
        });
    }

    toggleVisibility(recordId: string) {
        const {gridModel} = this;
        if (!gridModel) return;

        const record = this.chooserGridModel.store.getById(recordId);
        if (!record || !record.data.hideable) return;

        const newHidden = record.data.visible || record.data.indeterminate;
        const colIds: string[] = record.data.leafColIds;

        gridModel.updateColumnState(colIds.map(colId => ({colId, hidden: newHidden})));
    }

    /**
     * Validate a proposed drop position during unmanaged row dragging.
     * Returns highlight/position info to control the ag-grid drop indicator line,
     * or disallows the drop entirely.
     */
    getValidDropPosition(params: IsRowValidDropPositionParams): IsRowValidDropPositionResult {
        const sourceData = this.getChooserData(params.source),
            targetData = this.getChooserData(params.target);

        if (!sourceData || !targetData) return {allowed: false};
        if (sourceData.id === targetData.id) return {allowed: false};

        let {position} = params;

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

        return {allowed: true, highlight: true, position};
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
        if (!dropInfo) return;

        const targetData = this.getChooserData(dropInfo.target);
        if (!targetData) return;

        const position = dropInfo.position as RowDropTargetPosition;
        if (position === 'none') return;

        // Collect leaf colIds being moved (works for both leaf and group drags)
        const movingIds = new Set(sourceData.leafColIds);

        // Split current columnState
        const currentState = [...gridModel.columnState],
            remaining = currentState.filter(cs => !movingIds.has(cs.colId)),
            movingState = currentState.filter(cs => movingIds.has(cs.colId));

        if (!movingState.length) return;

        // Compute insertion index in remaining array
        const insertionIndex = this.computeInsertionIndex(remaining, targetData, position);

        // Splice and push
        remaining.splice(insertionIndex, 0, ...movingState);
        gridModel.updateColumnState(remaining.map(cs => ({...cs})));
    }

    async restoreDefaultsAsync() {
        await this.gridModel?.restoreDefaultsAsync();
    }

    //------------------
    // Implementation
    //------------------
    @action
    private syncFromGridModel() {
        if (!this.gridModel) return;
        const records = this.buildRecords();
        this.loadRecords(records, this.showGroups);
    }

    /**
     * Build chooser records bottom-up from columnState order.
     *
     * Iterates the columnState array (source of truth for display order), and for each leaf
     * column looks up its parent group chain from the column definitions. Adjacent columns
     * sharing the same group are merged under a single group node. Non-adjacent columns from
     * the same group produce separate group instances (split groups).
     */
    private buildRecords(): ColumnChooserData[] {
        const {gridModel} = this,
            {columnState} = gridModel;

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

        // Walk columnState in order, building leaf records and group records as needed.
        const records: ColumnChooserData[] = [];
        const groupInstanceCounts = new Map<string, number>();
        const activeGroups: (string | null)[] = [];

        for (let i = 0; i < columnState.length; i++) {
            const cs = columnState[i];
            const col = gridModel.findColumn(gridModel.columns, cs.colId);
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
                const group = chain[d];
                const count = (groupInstanceCounts.get(group.groupId) ?? 0) + 1;
                groupInstanceCounts.set(group.groupId, count);

                const instanceId = count > 1 ? `${group.groupId}_${count}` : group.groupId;
                const parentInstanceId =
                    d > 0 ? this.getActiveGroupId(chain, d - 1, groupInstanceCounts) : null;

                const leafCols = group.getLeafColumns();
                const leafColIds = leafCols.map(lc => lc.colId);
                const hiddenCount = leafColIds.filter(
                    id => gridModel.getStateForColumn(id)?.hidden
                ).length;
                const allVisible = hiddenCount === 0;
                const noneVisible = hiddenCount === leafColIds.length;

                records.push({
                    id: instanceId,
                    name: typeof group.headerName === 'string' ? group.headerName : group.groupId,
                    description: '',
                    visible: allVisible,
                    indeterminate: !allVisible && !noneVisible,
                    isGroup: true,
                    hideable: leafCols.some(lc => lc.hideable),
                    parentId: parentInstanceId,
                    sortOrder: i,
                    leafColIds
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
                indeterminate: false,
                isGroup: false,
                hideable: col.hideable,
                parentId: parentInstanceId,
                sortOrder: i,
                leafColIds: [cs.colId]
            });
        }

        return records;
    }

    private getActiveGroupId(
        chain: ColumnGroup[],
        depth: number,
        groupInstanceCounts: Map<string, number>
    ): string {
        const groupId = chain[depth].groupId;
        const count = groupInstanceCounts.get(groupId) ?? 1;
        return count > 1 ? `${groupId}_${count}` : groupId;
    }

    private loadRecords(records: ColumnChooserData[], showGroups: boolean) {
        const leaves = records.filter(r => !r.isGroup);
        const leafIdSet = new Set(leaves.map(r => r.id));

        if (!showGroups) {
            this.chooserGridModel.store.loadData(leaves);
            return;
        }

        // Tree mode: build nested structure with groups as parents
        const groups = records.filter(r => r.isGroup && r.leafColIds.some(id => leafIdSet.has(id)));
        const groupIdSet = new Set(groups.map(r => r.id));

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

        const rootGroups = groups.filter(r => !r.parentId || !groupIdSet.has(r.parentId));
        const rootLeaves = leaves.filter(r => !r.parentId || !groupIdSet.has(r.parentId));
        const rootRecords = [...rootGroups, ...rootLeaves].map(buildNested);

        this.chooserGridModel.store.loadData(rootRecords);
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

    /** Extract our ColumnChooserData from an ag-grid IRowNode (whose data is a StoreRecord). */
    private getChooserData(node: any): ColumnChooserData | null {
        return node?.data?.data ?? null;
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
     * Columns can only be reordered within their group; groups can only be reordered
     * among siblings at the same level.
     */
    private isValidLockedDrop(
        source: ColumnChooserData,
        target: ColumnChooserData,
        position: RowDropTargetPosition
    ): boolean {
        // Dropping above/below: source and target must share the same parent
        if (position === 'above' || position === 'below') {
            return source.parentId === target.parentId;
        }

        // Dropping inside a group: source must already be a child of that group,
        // or share the same parent as the group (moving into a sibling group — not valid when locked)
        if (position === 'inside' && target.isGroup) {
            return source.parentId === target.id;
        }

        return false;
    }

    /**
     * Compute where to insert moved columns in the remaining columnState array.
     * `remaining` is the columnState with the moved columns already removed.
     */
    private computeInsertionIndex(
        remaining: {colId: string}[],
        targetData: ColumnChooserData,
        position: RowDropTargetPosition
    ): number {
        const targetLeafIds = new Set(targetData.leafColIds);

        if (targetData.isGroup) {
            const firstIdx = remaining.findIndex(cs => targetLeafIds.has(cs.colId));
            const lastIdx = this.findLastIndex(remaining, cs => targetLeafIds.has(cs.colId));

            if (firstIdx === -1) return remaining.length;
            if (position === 'above') return firstIdx;
            return lastIdx + 1; // 'below' or 'inside'
        }

        // Leaf target
        const targetIdx = remaining.findIndex(cs => cs.colId === targetData.id);
        if (targetIdx === -1) return remaining.length;
        return position === 'above' ? targetIdx : targetIdx + 1;
    }

    private findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (predicate(arr[i])) return i;
        }
        return -1;
    }
}
