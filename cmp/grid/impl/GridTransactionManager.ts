/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed, Some} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {RecordSet, RecordSetDelta} from '@xh/hoist/data/impl/RecordSet';
import {DeferredWorkScheduler} from '@xh/hoist/cmp/grid/impl/DeferredWorkScheduler';
import {get, isArray, isEmpty, isEqual, isFunction} from 'lodash';
import {GridModel} from '../GridModel';

/**
 * How much of ag-Grid's client-side model refresh a transaction requires:
 *   'suppress' - skip the sort/filter/group/flatten stages entirely - just a row data swap and
 *                cell refresh.
 *   'delta'    - full refresh, but sort only the changed rows and merge them into the existing
 *                sorted order (ag-Grid `deltaSort`).
 *   'full'     - full refresh with a full sort.
 */
type RefreshMode = 'suppress' | 'delta' | 'full';

/**
 * Applies Store transactions to ag-Grid on behalf of Grid, minimizing the portion of ag-Grid's
 * client-side model refresh each transaction actually runs.
 *
 * Pure updates provably unable to affect row order, grouping, or tree structure suppress the
 * model refresh entirely. The proof comes from {@link RecordSetDelta.changedFields} when the
 * producing transaction supplied them (e.g. cube View streaming updates), or from comparing
 * sorted field values record-by-record against the prior RecordSet otherwise. Smaller
 * transactions that miss that bar sort via ag-Grid `deltaSort`; the rest run a full sort.
 *
 * Update-only transactions that would require a re-sort are also applied suppressed - cell
 * values update immediately while row order goes briefly stale - and the touched rows
 * accumulate for a managed flush that restores order.
 * Flushes pace adaptively off their own measured cost (see the `deferredSortFactor`
 * experimental flag), bounding sort work to a fraction of main-thread time. The flush lands at the browser's next
 * idle moment, deadline-bounded, and re-applies the touched rows under ag-Grid `deltaSort` when
 * few enough are pending, falling back to a full re-sort.
 *
 * @internal
 */
export class GridTransactionManager extends HoistBase {
    private model: GridModel;

    @managed
    private sortScheduler: DeferredWorkScheduler;

    // Rows updated by suppressed transactions since the last sort - null when order is current.
    private pendingSortIds: Set<StoreRecordId> = null;

    // True when order may be stale beyond any tracked rows - the flush must run a full sort.
    private pendingSortFull = false;

    // Cached provable sort paths - undefined = stale, null = sort not provably value-based.
    private _sortPaths: Array<Some<string>> | null | undefined;

    constructor(model: GridModel) {
        super();
        this.model = model;
        this.sortScheduler = new DeferredWorkScheduler({
            runFn: () => this.flushPendingSort(),
            maxDeferral: GridModel.MAX_DEFERRED_SORT,
            factorFn: () => this.deferredSortFactor
        });

        this.addReaction({
            track: () => [model.sortBy, model.columns],
            run: () => (this._sortPaths = undefined)
        });
    }

    apply(transaction: RecordSetDelta, prevRs: RecordSet, newRs: RecordSet) {
        const {agApi} = this.model,
            mode = this.getRefreshMode(transaction, prevRs, newRs),
            suppress = mode === 'suppress';

        agApi.updateGridOptions({
            suppressModelUpdateAfterUpdateTransaction: suppress,
            deltaSort: mode === 'delta'
        });
        try {
            agApi.applyTransaction(transaction);
            if (!suppress) {
                this.pendingSortIds = null;
                this.pendingSortFull = false;
            }
        } finally {
            agApi.updateGridOptions({
                suppressModelUpdateAfterUpdateTransaction: false,
                deltaSort: false
            });
        }
    }

    /**
     * Note current row order may be stale with no transaction to prove otherwise - e.g. a
     * calculated sort value moved by a summary-only update. Schedules a paced full re-sort.
     */
    noteSortStale() {
        this.pendingSortFull = true;
        this.pendingSortIds ??= new Set();
        this.sortScheduler.scheduleAsync();
    }

    //------------------------
    // Implementation
    //------------------------
    private getRefreshMode(t: RecordSetDelta, prevRs: RecordSet, newRs: RecordSet): RefreshMode {
        const {model} = this,
            {update, add, remove, changedFields} = t,
            updatesOnly = isEmpty(add) && isEmpty(remove);

        if (updatesOnly && isEmpty(model.groupBy) && !model.agApi.isAnyFilterPresent()) {
            // changedFields carries its producer's assertion that structure is untouched -
            // otherwise verify each record kept its place in the tree.
            const structureStable = changedFields
                ? true
                : update.every(rec => {
                      const prev = prevRs.getById(rec.id);
                      return prev && (!model.treeMode || isEqual(rec.treePath, prev.treePath));
                  });

            if (structureStable) {
                if (this.sortUnchanged(update, prevRs, changedFields)) return 'suppress';

                // Suppress even when order is affected, leaving it stale until the pending flush.
                if (this.deferredSortFactor > 0) {
                    this.notePendingSort(update);
                    return 'suppress';
                }
            }
        }

        // With a flush pending, current order is stale - a delta merge would preserve the
        // staleness, so any refresh must be full (which resolves the pending flush, per apply).
        if (this.pendingSortIds) return 'full';

        const changedCount = update.length + add.length + remove.length;
        return newRs.count > 0 && changedCount / newRs.count < this.deltaSortRatio
            ? 'delta'
            : 'full';
    }

    // True if this update provably cannot reorder any row.
    private sortUnchanged(
        updates: StoreRecord[],
        prevRs: RecordSet,
        changedFields: Set<string>
    ): boolean {
        const sortPaths = this.getSortPaths();
        if (!sortPaths) return false;

        // Calculated sort values can move via inputs outside any updated row - nothing provable.
        const calcNames = this.model.store.calculatedFieldNames;
        if (calcNames.size && sortPaths.some(p => calcNames.has(isArray(p) ? p[0] : p))) {
            return false;
        }

        if (changedFields) {
            return sortPaths.every(p => !changedFields.has(isArray(p) ? p[0] : p));
        }

        const getVal = (data, path) => (isArray(path) ? get(data, path) : data[path]);
        return updates.every(rec => {
            const prev = prevRs.getById(rec.id);
            return (
                prev &&
                // A record sharing its predecessor's data object (row-reuse stores mutate row
                // data in place) has already lost its old values - nothing can be proven.
                prev.data !== rec.data &&
                sortPaths.every(p => getVal(rec.data, p) === getVal(prev.data, p))
            );
        });
    }

    /**
     * The raw data path each active sorter provably sorts on, or null if any sort depends on
     * more than that value (custom comparator, custom getValueFn, or a sortValue function - all
     * of which can read arbitrary record state). Cached until sortBy or columns change.
     */
    private getSortPaths(): Array<Some<string>> | null {
        let ret = this._sortPaths;
        if (ret === undefined) ret = this._sortPaths = this.computeSortPaths();
        return ret;
    }

    private computeSortPaths(): Array<Some<string>> | null {
        const {model} = this,
            ret = [];
        for (const sorter of model.sortBy) {
            const col = model.getColumn(sorter.colId);
            if (!col || col.comparator || col.getValueFn !== col.defaultGetValueFn) return null;
            const {sortValue} = col;
            if (isFunction(sortValue)) return null;
            // A string sortValue falls back to the column's own value when nullish per-record.
            const paths = sortValue != null ? [sortValue, col.fieldPath] : [col.fieldPath];
            if (paths.some(p => p == null)) return null;
            ret.push(...paths);
        }
        return ret;
    }

    // Changed-row fraction above which a full sort beats a delta sort - see the experimental
    // flag's doc for the cost model.
    private get deltaSortRatio(): number {
        return (this.model.experimental.deltaSortRatio ?? 50) / 100;
    }

    private get deferredSortFactor(): number {
        return this.model.experimental.deferredSortFactor ?? 4;
    }

    private notePendingSort(updates: StoreRecord[]) {
        const ids = (this.pendingSortIds ??= new Set());
        updates.forEach(rec => ids.add(rec.id));
        this.sortScheduler.scheduleAsync();
    }

    private flushPendingSort() {
        const {model, pendingSortIds, pendingSortFull} = this,
            latestRs = model._syncedRs;
        // Not ready - leave ids pending; the next transaction will run 'full' and resolve them.
        if (!pendingSortIds || !latestRs || !model.isReady) return;
        this.pendingSortIds = null;
        this.pendingSortFull = false;

        const start = performance.now(),
            {agApi} = model,
            update = [];
        pendingSortIds.forEach(id => {
            const rec = latestRs.getById(id);
            if (rec) update.push(rec);
        });

        if (
            !pendingSortFull &&
            update.length &&
            update.length / latestRs.count < this.deltaSortRatio
        ) {
            agApi.updateGridOptions({deltaSort: true});
            try {
                agApi.applyTransaction({update});
            } finally {
                agApi.updateGridOptions({deltaSort: false});
            }
            model.diagnostics.noteSortFlush('delta', update.length, latestRs.count, start);
        } else {
            agApi.refreshClientSideRowModel('sort');
            model.diagnostics.noteSortFlush('full', update.length, latestRs.count, start);
        }
    }
}
