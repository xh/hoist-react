/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {CellRange, GridApi, IRowNode, RowPosition} from '@xh/hoist/kit/ag-grid';
import {HoistModel} from '@xh/hoist/core';
import type {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {action, computed, observable, observableRef} from '@xh/hoist/mobx';
import {compact, isEmpty, isEqual, last} from 'lodash';
import type {Column} from './columns/Column';
import type {GridModel} from './GridModel';

/**
 * A rectangular range of cells selected in a {@link Grid} with cell selection enabled.
 */
export interface GridCellRange {
    /**
     * Records of the rows the range covers, in display order. Includes docked summary records.
     * Group rows in a grid with `groupBy` have no record and are left out, so a range over group
     * rows only has no records.
     */
    records: StoreRecord[];

    /** Columns the range covers, in display order. */
    columns: Column[];

    /**
     * Record of the cell where the range started. Null if the range started on a group row, which
     * has no record - the grid then has no selected record. Read the range's cells from `records`
     * and `columns`, which are set either way.
     */
    startRecord: StoreRecord;

    /** Column of the cell where the range started. */
    startColumn: Column;
}

/** A single cell within a {@link GridCellRange}. */
export interface GridCell {
    record: StoreRecord;
    column: Column;
}

/**
 * Cell range selection state for a {@link GridModel}, created when `GridConfig.cellSelection` is
 * set. Available as `GridModel.cellSelectionModel`.
 *
 * Users select ranges of cells by clicking, dragging, Shift+clicking and Shift+arrowing, and add
 * further ranges with Ctrl/Cmd+click. Ctrl/Cmd+C copies the selected cells. The grid's selected
 * record follows the start cell of the newest range, so a panel bound to the selection shows one
 * record while the user extends a range. Ranges never become selected records.
 *
 * Ranges are cleared when the user sorts or filters, when data is loaded, when rows are added or
 * removed, when `groupBy` or the expanded tree nodes change, and when the selected record is
 * changed by anything other than the ranges themselves. Ranges are kept through in-place value
 * updates, with `ranges` updated to the latest records, unless the update moves rows.
 *
 * Requires ag-Grid Enterprise with `CellSelectionModule` registered. Desktop only, and not
 * supported with `selModel` mode `multiple`.
 */
export class GridCellSelectionModel extends HoistModel {
    override xhImpl = true;

    readonly gridModel: GridModel;

    /**
     * True when cell selection is active in the rendered grid. False until a `Grid` component
     * renders this model, and if ag-Grid's `CellSelectionModule` is not registered.
     */
    @observable accessor isEnabled: boolean = false;

    /** Selected ranges, oldest first. The last range is the newest. */
    @observableRef accessor ranges: GridCellRange[] = [];

    /** True if no cells are selected. */
    get isEmpty(): boolean {
        return isEmpty(this.ranges);
    }

    /**
     * Every selected cell, once each, in range order. A cell covered by more than one range is
     * listed once, from the first range that covers it.
     *
     * Builds one object per cell, so a select all in a large grid builds hundreds of thousands.
     * For work over large selections, such as totals, loop over the `records` and `columns` of
     * each of the `ranges` instead.
     */
    @computed
    get cells(): GridCell[] {
        const {ranges, rangeKeys} = this,
            ret: GridCell[] = [];
        ranges.forEach(({records, columns}, idx) => {
            const earlierKeys = rangeKeys.slice(0, idx);
            records.forEach(record => {
                const coveringKeys = earlierKeys.filter(it => it.recordIds.has(record.id));
                columns.forEach(column => {
                    if (!coveringKeys.some(it => it.colIds.has(column.colId))) {
                        ret.push({record, column});
                    }
                });
            });
        });
        return ret;
    }

    // Id of the record the grid should select for the current ranges - see `isSelectionInSync`.
    private anchorSelectionId: StoreRecordId = null;

    // Record and column ids of each of `ranges`, for constant-time lookups.
    private rangeKeys: RangeKeys[] = [];

    // Ranges as last read from ag-Grid. The same as `ranges`, except during a drag, when `ranges`
    // is updated only as the drag starts and ends.
    private agRanges: GridCellRange[] = [];
    private isDragging = false;

    constructor(gridModel: GridModel) {
        super();
        this.gridModel = gridModel;
        const {store, selModel} = gridModel;

        this.addReaction(
            {
                track: () => [
                    gridModel.sortBy,
                    gridModel.groupBy,
                    gridModel.expandState,
                    store.filter,
                    store.lastLoaded
                ],
                run: () => this.clear()
            },
            {
                track: () => selModel.selectedIds,
                run: () => {
                    if (!this.isEmpty && !this.isSelectionInSync()) this.clear();
                }
            }
        );
    }

    /**
     * True if the cell at the given record and column is in a selected range. Takes constant time
     * per range, so it can be called for each rendered cell.
     */
    isCellSelected(record: StoreRecord, colId: string): boolean {
        // Read `ranges` through `isEmpty`, so that observers re-run when the ranges change.
        if (this.isEmpty) return false;
        return this.rangeKeys.some(it => it.recordIds.has(record.id) && it.colIds.has(colId));
    }

    /** Clear all selected ranges. */
    clear() {
        const {agApi} = this.gridModel;
        if (this.isEnabled && agApi) agApi.clearCellSelection();
        this.setRanges([]);
    }

    //------------------------
    // Grid integration
    //------------------------
    /**
     * Read the ranges from ag-Grid and move the selected record to the start cell of the newest
     * range. Called by `Grid` on each ag-Grid `cellSelectionChanged` event, passing its `started`
     * and `finished` flags. Pass `syncSelection: false` to keep the selected record, as for select
     * all.
     * @internal
     */
    @action
    noteAgRangesChanged(opts: {syncSelection: boolean; started: boolean; finished: boolean}) {
        const {syncSelection, started, finished} = opts,
            ranges = this.readAgRanges();
        this.agRanges = ranges;
        this.isDragging = !finished;

        // ag-Grid reports each cell crossed during a drag. The drag cannot move the start of the
        // range, so `ranges` and the selected record are updated only as it starts and ends.
        if (!started && !finished) return;

        this.setRanges(ranges);
        if (isEmpty(ranges)) return;

        const {selModel} = this.gridModel;
        if (!syncSelection) {
            this.anchorSelectionId = selModel.selectedId;
            return;
        }

        this.anchorSelectionId = this.getAnchorSelectionId();
        if (!selModel.isEnabled || this.isSelectionInSync()) return;
        if (this.anchorSelectionId == null) {
            selModel.clear();
        } else {
            selModel.select(this.anchorSelectionId);
        }
    }

    /**
     * Re-read the ranges after ag-Grid rows change. Clears the ranges if any now covers different
     * rows, otherwise picks up the latest record instances for in-place updates.
     * @internal
     */
    noteAgRowsChanged() {
        if (isEmpty(this.agRanges) || !this.isEnabled) return;
        const ranges = this.readAgRanges(),
            toIds = (rs: GridCellRange[]) => rs.map(r => r.records.map(it => it.id));

        if (!isEqual(toIds(ranges), toIds(this.agRanges))) {
            this.clear();
        } else if (this.isDragging) {
            this.agRanges = ranges;
        } else {
            this.setRanges(ranges);
        }
    }

    /** @internal */
    @action
    setEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
        if (!isEnabled) this.setRanges([]);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private setRanges(ranges: GridCellRange[]) {
        this.agRanges = ranges;
        if (isEmpty(ranges) && isEmpty(this.ranges)) return;
        this.rangeKeys = ranges.map(({records, columns}) => ({
            recordIds: new Set(records.map(it => it.id)),
            colIds: new Set(columns.map(it => it.colId))
        }));
        this.ranges = ranges;
        if (isEmpty(ranges)) this.anchorSelectionId = null;
    }

    // The anchor rule: the selected record is the record at the start of the newest range. A start
    // in a pinned row, or in a group row, selects nothing - as a click there does today.
    private getAnchorSelectionId(): StoreRecordId {
        const {agApi} = this.gridModel,
            startRow = last(agApi?.getCellRanges())?.startRow;
        if (!startRow || startRow.rowPinned) return null;
        return this.nodeAt(startRow, agApi)?.data?.id ?? null;
    }

    private isSelectionInSync(): boolean {
        const {selectedIds} = this.gridModel.selModel,
            expected = this.anchorSelectionId;
        return expected == null ? isEmpty(selectedIds) : isEqual(selectedIds, [expected]);
    }

    private readAgRanges(): GridCellRange[] {
        const {agApi} = this.gridModel;
        if (!agApi) return [];
        return compact((agApi.getCellRanges() ?? []).map(it => this.toGridCellRange(it, agApi)));
    }

    private toGridCellRange(range: CellRange, agApi: GridApi): GridCellRange {
        const {gridModel} = this,
            {startRow, endRow, startColumn} = range;
        if (!startRow || !endRow) return null;

        const columns = compact(range.columns.map(it => gridModel.getColumn(it.getColId())));
        if (isEmpty(columns)) return null;

        const startOrdinal = this.toOrdinal(startRow, agApi),
            endOrdinal = this.toOrdinal(endRow, agApi),
            records: StoreRecord[] = [];
        for (
            let i = Math.min(startOrdinal, endOrdinal);
            i <= Math.max(startOrdinal, endOrdinal);
            i++
        ) {
            const record = this.nodeAtOrdinal(i, agApi)?.data;
            if (record) records.push(record);
        }

        return {
            records,
            columns,
            startRecord: this.nodeAt(startRow, agApi)?.data ?? null,
            startColumn: gridModel.getColumn(startColumn.getColId()) ?? columns[0]
        };
    }

    // Rows in display order: pinned top, then body, then pinned bottom.
    private toOrdinal({rowIndex, rowPinned}: RowPosition, agApi: GridApi): number {
        if (rowPinned === 'top') return rowIndex;
        const topCount = agApi.getPinnedTopRowCount();
        if (!rowPinned) return topCount + rowIndex;
        return topCount + agApi.getDisplayedRowCount() + rowIndex;
    }

    private nodeAtOrdinal(ordinal: number, agApi: GridApi): IRowNode {
        const topCount = agApi.getPinnedTopRowCount(),
            bodyCount = agApi.getDisplayedRowCount();
        if (ordinal < topCount) return agApi.getPinnedTopRow(ordinal);
        if (ordinal < topCount + bodyCount) return agApi.getDisplayedRowAtIndex(ordinal - topCount);
        return agApi.getPinnedBottomRow(ordinal - topCount - bodyCount);
    }

    private nodeAt({rowIndex, rowPinned}: RowPosition, agApi: GridApi): IRowNode {
        if (rowPinned === 'top') return agApi.getPinnedTopRow(rowIndex);
        if (rowPinned === 'bottom') return agApi.getPinnedBottomRow(rowIndex);
        return agApi.getDisplayedRowAtIndex(rowIndex);
    }
}

interface RangeKeys {
    recordIds: Set<StoreRecordId>;
    colIds: Set<string>;
}
