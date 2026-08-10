/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnState, GridModel} from '@xh/hoist/cmp/grid';
import type {Some} from '@xh/hoist/core';
import {hoistCmp, HoistModel, managed} from '@xh/hoist/core';
import type {Filter} from '@xh/hoist/data';
import {StoreRecordId} from '@xh/hoist/data';
import type {GridOptions, IRowNode, RowDragEndEvent} from '@xh/hoist/kit/ag-grid';
import {makeObservable} from '@xh/hoist/mobx';
import {castArray} from 'lodash';

import type {ColChooserModel} from './ColChooserModel';
import {
    chooserDragAgOptions,
    chooserDragText,
    chooserGridConfig,
    chooserLibraryColumn,
    chooserVisibilityKeyHandler,
    dragRejectHint,
    getChooserData,
    type ColChooserDropParticipant,
    type ColLibraryData
} from './ColChooserUtils';

const UNGROUPED = 'Ungrouped';

/**
 * Model backing the ColChooser's optional Column Library - a grid of all currently hidden columns,
 * grouped by `chooserGroup`. Dragging a column out onto a bucket shows and positions it (handled by the
 * receiving bucket); dragging one in hides it, leaving its position untouched.
 * @internal
 */
export class ColLibraryModel extends HoistModel implements ColChooserDropParticipant {
    override xhImpl = true;

    readonly parent: ColChooserModel;

    private readonly collapseGroups: boolean;

    private readonly autoExpandOnFilter: number;

    private preFilterExpanded: Set<string> = null;

    private lastFilter: Filter = null;

    private seenGroupKeys = new Set<string>();

    @managed
    chooserGridModel: GridModel;

    /** The target GridModel whose columns this library reflects. */
    get targetGridModel(): GridModel {
        return this.parent.gridModel;
    }

    get agOptions(): GridOptions {
        return {
            ...chooserDragAgOptions,
            suppressGroupChangesColumnVisibility: true,
            rowDragText: (dragItem, count) =>
                chooserDragText(this.parent.dragHint, dragItem, count),
            onCellDoubleClicked: event => {
                const id = event.data?.data?.id;
                if (id) this.toggleVisibility(id);
            }
        };
    }

    constructor({
        parent,
        collapseGroups,
        autoExpandOnFilter
    }: {
        parent: ColChooserModel;
        collapseGroups: boolean;
        autoExpandOnFilter: number;
    }) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.collapseGroups = collapseGroups;
        this.autoExpandOnFilter = autoExpandOnFilter;
        this.chooserGridModel = this.createGridModel();

        this.addReaction({
            track: () => this.parent.filterTestFn,
            run: testFn =>
                this.chooserGridModel.store.setFilter(testFn ? {key: 'default', testFn} : null)
        });

        // Debounced a tick to run after the Grid's own dataReaction pushes filtered records into
        // ag-grid - registered first, this would otherwise read a stale set of group nodes.
        this.addReaction({
            track: () => {
                const {agApi, store, expandState} = this.chooserGridModel;
                return [agApi, store.records, store.filter, expandState];
            },
            run: () => this.syncGroupExpandState(),
            debounce: 0
        });
    }

    /** Reload the library with the currently hidden, non-excluded columns. groupBy does the rest. */
    syncFromState(columnState: ColumnState[]) {
        const {targetGridModel, chooserGridModel} = this;

        let grouped = false;
        const data: ColLibraryData[] = [];
        columnState.forEach(cs => {
            if (!cs.hidden) return;
            const col = targetGridModel.getColumn(cs.colId);
            if (!col || col.excludeFromChooser) return;
            if (col.chooserGroup) grouped = true;
            data.push({
                id: cs.colId,
                name: col.chooserName,
                description: col.chooserDescription ?? '',
                chooserGroup: col.chooserGroup ?? UNGROUPED,
                movable: col.movable,
                isGroup: false,
                leafColIds: [cs.colId],
                fromLibrary: true
            });
        });

        // Group only when some hidden column declares a chooserGroup, else a lone "Ungrouped" header
        // would wrap an ungrouped grid.
        chooserGridModel.setGroupBy(grouped ? 'chooserGroup' : null);
        chooserGridModel.store.loadData(data);
    }

    /**
     * Show the given library rows in place, without repositioning them - they reappear wherever they
     * already sit in the master order.
     */
    toggleVisibility(recordIds: Some<StoreRecordId>) {
        const {store} = this.chooserGridModel,
            colIds = new Set<string>();

        castArray(recordIds).forEach(id => {
            const record = store.getById(id);
            record?.data.leafColIds.forEach((colId: string) => colIds.add(colId));
        });
        if (!colIds.size) return;

        const newState = this.parent.currentState.map(cs =>
            colIds.has(cs.colId) ? {...cs, hidden: false} : cs
        );
        this.parent.applyState(newState);
    }

    /** Handle a column dragged onto the library from a bucket - hide it, leaving its position. */
    handleCrossBucketDrop(event: RowDragEndEvent, source: ColChooserDropParticipant) {
        if (source === this) return;

        const {targetGridModel} = this,
            hideIds = new Set(
                (event.nodes ?? [])
                    .flatMap(node => getChooserData(node)?.leafColIds ?? [])
                    // A movable-but-locked column can be dragged here - dropping it is a no-op.
                    .filter(colId => targetGridModel.isColumnHideable(colId))
            );
        if (!hideIds.size) return;

        const newState = this.parent.currentState.map(cs =>
            hideIds.has(cs.colId) ? {...cs, hidden: true} : cs
        );
        this.parent.applyState(newState);
    }

    getCrossBucketDropIcon(draggingEvent: any): string {
        const {targetGridModel} = this,
            dragItem = draggingEvent?.dragItem,
            nodes = dragItem?.rowNodes?.length
                ? dragItem.rowNodes
                : dragItem?.rowNode
                  ? [dragItem.rowNode]
                  : [],
            leafColIds: string[] = nodes.flatMap((n: any) => getChooserData(n)?.leafColIds ?? []);

        // Refuse a drag with no hideable leaf; a partially hideable group hides its hideable leaves.
        if (leafColIds.some(id => targetGridModel.isColumnHideable(id))) {
            this.parent.setDragHint(null);
            return 'hide';
        }
        this.parent.setDragHint(dragRejectHint('notHideable'));
        return 'notAllowed';
    }

    private get emptyText() {
        if (this.parent.filterTestFn) {
            return 'No columns found matching the filter';
        }

        return 'No hidden columns';
    }

    private libraryEmptyText = hoistCmp.factory(() => this.emptyText);

    private syncGroupExpandState() {
        const {autoExpandOnFilter, chooserGridModel} = this,
            {agApi, store} = chooserGridModel;
        if (!autoExpandOnFilter) return;

        // Grid unmounted (library hidden / chooser closed) - drop our bookkeeping so the next open
        // starts from the configured default rather than restoring a prior session's expansions.
        if (!agApi || agApi.isDestroyed()) {
            this.preFilterExpanded = null;
            this.lastFilter = null;
            this.seenGroupKeys = new Set();
            return;
        }

        const groups: IRowNode[] = [];
        agApi.forEachNode(node => {
            if (node.group) groups.push(node);
        });

        const {filter} = store,
            filterChanged = filter !== this.lastFilter;
        this.lastFilter = filter;

        if (!filter) {
            // Unfiltered - restore the user's own expansions on the way out of a filter, then keep
            // tracking them (the reaction watches expandState) as the baseline for the next one.
            const restore = this.preFilterExpanded;
            if (filterChanged && restore) {
                this.setGroupsExpanded(groups, node => restore.has(node.key));
            }
            this.preFilterExpanded = new Set(
                groups.filter(node => node.expanded).map(node => node.key)
            );
        } else {
            // Rows are filtered out of the Store, not by ag-grid, so allChildrenCount is post-filter.
            this.setGroupsExpanded(groups, node =>
                this.shouldReDerive(node, filterChanged)
                    ? node.allChildrenCount <= autoExpandOnFilter
                    : node.expanded
            );
        }

        this.seenGroupKeys = new Set(groups.map(node => node.key));
    }

    private shouldReDerive(node: IRowNode, filterChanged: boolean): boolean {
        return filterChanged || !this.seenGroupKeys.has(node.key);
    }

    private setGroupsExpanded(groups: IRowNode[], expandedFn: (node: IRowNode) => boolean) {
        let changed = false;
        groups.forEach(node => {
            const expanded = expandedFn(node);
            if (node.expanded !== expanded) {
                node.expanded = expanded;
                changed = true;
            }
        });
        // Called on every library data resync - skip the repaint when nothing moved.
        if (changed) this.chooserGridModel.agApi.onGroupExpandedOrCollapsed();
    }

    private createGridModel(): GridModel {
        return new GridModel({
            ...chooserGridConfig,
            expandLevel: this.collapseGroups ? 0 : 1,
            sortBy: 'name',
            emptyText: this.libraryEmptyText(),
            onKeyDown: chooserVisibilityKeyHandler(this),
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'chooserGroup', type: 'string'},
                    {name: 'movable', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'leafColIds', type: 'json'},
                    {name: 'fromLibrary', type: 'bool'}
                ]
            },
            rowClassRules: {
                'xh-col-chooser__column-row': ({data: rec}) => rec && !rec.isSummary
            },
            columns: [
                chooserLibraryColumn(),
                {
                    field: 'chooserGroup',
                    hidden: true
                }
            ]
        });
    }
}
