import {GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
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
    setShowGroups: (v: boolean) => void;

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
            sortBy: 'sortOrder',
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
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1,
                    isTreeColumn: true,
                    renderer: (v, {record}) => record.data.name,
                    agOptions: {
                        rowDrag: true
                    }
                },
                {
                    colId: 'sortOrder',
                    hidden: true
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
}
