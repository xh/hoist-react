/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed, Some} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {RecordSet, RecordSetDelta} from '@xh/hoist/data/impl/RecordSet';
import {Timer} from '@xh/hoist/utils/async';
import {get, isArray, isEmpty, isEqual, isFunction} from 'lodash';
import type {GridModel} from '../GridModel';

/**
 * How much of ag-Grid's client-side model refresh a transaction requires:
 *   'suppress' - skip the sort/filter/group/flatten stages entirely - just a row data swap and
 *                cell refresh.
 *   'delta'    - full refresh, but sort only the changed rows and merge them into the existing
 *                sorted order (ag-Grid `deltaSort`).
 *   'full'     - full refresh with a full sort.
 */
type RefreshMode = 'suppress' | 'delta' | 'full';

// Transactions changing less than this fraction of rows sort via deltaSort - above it, merging
// changed rows into the existing order stops beating a full sort.
const DELTA_SORT_MAX_RATIO = 0.2;

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
 * With {@link GridModel.streamingSortInterval} set, update-only transactions that would require
 * a re-sort are also applied suppressed - cell values update immediately while row order goes
 * briefly stale - and a managed timer restores sort order at most once per interval.
 *
 * @internal
 */
export class GridTransactionManager extends HoistBase {
    private model: GridModel;
    private sortDirty = false;
    @managed private sortTimer: Timer;

    // Cached provable sort paths - undefined = stale, null = sort not provably value-based.
    private _sortPaths: Array<Some<string>> | null | undefined;

    constructor(model: GridModel) {
        super();
        this.model = model;

        this.addReaction({
            track: () => [model.sortBy, model.columns],
            run: () => (this._sortPaths = undefined)
        });

        this.sortTimer = Timer.create({
            runFn: () => this.flushPendingSort(),
            interval: () => model.streamingSortInterval ?? -1
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
            if (!suppress) this.sortDirty = false;
        } finally {
            agApi.updateGridOptions({suppressModelUpdateAfterUpdateTransaction: false});
        }
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

                // Streaming mode: suppress anyway, leaving order stale until the next
                // interval flush.
                if (model.streamingSortInterval > 0) {
                    this.sortDirty = true;
                    return 'suppress';
                }
            }
        }

        // deltaSort not possible if we let the sort lapse.
        if (this.sortDirty) return 'full';

        const changedCount = update.length + add.length + remove.length;
        return newRs.count > 0 && changedCount / newRs.count < DELTA_SORT_MAX_RATIO
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
            const path = sortValue ?? col.fieldPath;
            if (path == null) return null;
            ret.push(path);
        }
        return ret;
    }

    private flushPendingSort() {
        const {model, sortDirty} = this;
        if (!sortDirty || !model.isReady) return;
        this.sortDirty = false;
        model.agApi.refreshClientSideRowModel('sort');
    }
}
