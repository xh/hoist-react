/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Column, ColumnGetValueFn, GridModel} from '@xh/hoist/cmp/grid';
import type {Store, StoreRecord} from '@xh/hoist/data';
import {compact, isEmpty} from 'lodash';

/**
 * Return the GridModel's root records in the order the grid renders them - sorted per its groupBy
 * and sortBy and, for tree grids, flattened depth-first through each record's children.
 *
 * Used to reproduce rendered row order for consumers that work off the Store rather than ag-Grid,
 * e.g. export and find. Always returns a newly allocated array, and never mutates the Store's own.
 * Sorts via decorate-sort-undecorate, resolving each record's value and row node once rather than
 * on every comparison. Note this yields leaf records only - the group rows rendered for a grouped
 * grid are synthetic ag-Grid nodes with no backing StoreRecord.
 * @internal
 */
export function getSortedRecords(gridModel: GridModel): StoreRecord[] {
    const {treeMode, store} = gridModel,
        records = store.rootRecords;

    // ag-Grid ignores row grouping in tree mode, so groupBy applies to flat grids only. There it
    // orders the entire list, ahead of sortBy - a composite sort with the group keys first.
    if (!treeMode) {
        return sortRecords(gridModel, records, [
            ...getGroupSorters(gridModel),
            ...getColumnSorters(gridModel)
        ]);
    }

    const sorters = getColumnSorters(gridModel),
        ret: StoreRecord[] = [];

    const visit = (recs: StoreRecord[]) => {
        sortRecords(gridModel, recs, sorters).forEach(rec => {
            ret.push(rec);
            if (!isEmpty(rec.children)) visit(rec.children);
        });
    };

    visit(records);
    return ret;
}

/**
 * Sort records by the given sorters, in priority order.
 *
 * Resolves each record's value and ag-Grid row node once (decorate-sort-undecorate) rather than on
 * every comparison. Always returns a newly allocated array - note `StoreRecord.children` returns
 * the Store's own array, not a copy, so sorting in place would corrupt Store state.
 */
function sortRecords(
    gridModel: GridModel,
    records: StoreRecord[],
    sorters: RecordSorter[]
): StoreRecord[] {
    if (records.length < 2 || isEmpty(sorters)) return [...records];

    const {agApi} = gridModel,
        decorated = records.map(record => ({
            record,
            node: agApi?.getRowNode(record.agId),
            values: sorters.map(({getValueFn, ctx}) => getValueFn({record, ...ctx}))
        }));

    decorated.sort((a, b) => {
        for (let i = 0; i < sorters.length; i++) {
            const ret = sorters[i].compare(a.values[i], b.values[i], a.node, b.node);
            if (ret) return ret;
        }
        return 0;
    });

    return decorated.map(it => it.record);
}

/** Sorters for GridModel.sortBy, using each Column's ag-Grid comparator. */
function getColumnSorters(gridModel: GridModel): RecordSorter[] {
    return compact(
        gridModel.sortBy.map(({colId, sort}) => {
            const column = gridModel.getColumn(colId);
            if (!column) return null;

            const compFn = (column.getAgSpec().comparator as Function).bind(column),
                direction = sort === 'desc' ? -1 : 1;

            return {
                ...sorterFor(gridModel, column),
                compare: (a, b, nodeA, nodeB) => compFn(a, b, nodeA, nodeB) * direction
            };
        })
    );
}

/** Sorters for GridModel.groupBy, using the GridModel's groupSortFn. */
function getGroupSorters(gridModel: GridModel): RecordSorter[] {
    const {groupSortFn} = gridModel;

    return compact(
        gridModel.groupBy.map(colId => {
            const column = gridModel.getColumn(colId);
            if (!column) return null;

            const {field} = column;
            return {
                ...sorterFor(gridModel, column),
                compare: (a, b, nodeA, nodeB) => groupSortFn(a, b, field, {gridModel, nodeA, nodeB})
            };
        })
    );
}

/** Value-resolution half of a sorter - the caller supplies the comparator. */
function sorterFor(gridModel: GridModel, column: Column) {
    const {field, getValueFn} = column;
    return {getValueFn, ctx: {field, column, gridModel, store: gridModel.store, agParams: null}};
}

/**
 * One key within a record sort, in priority order.
 * @internal
 */
interface RecordSorter {
    getValueFn: ColumnGetValueFn;
    ctx: {field: string; column: Column; gridModel: GridModel; store: Store; agParams: any};
    compare: (valueA: any, valueB: any, nodeA: any, nodeB: any) => number;
}
