/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Column} from '@xh/hoist/cmp/grid';
import type {FilterMatchMode, StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {getFilterRegex} from '@xh/hoist/data';
import type {AgColumn, IRowNode} from '@xh/hoist/kit/ag-grid';
import {action, compareStructural, computed, observable, observableRef} from '@xh/hoist/mobx';
import {compact, findLastIndex, isEmpty, isEqual, isNil, min} from 'lodash';
import {BaseGridFindImplModel} from './BaseGridFindImplModel';
import {getCellText, isHeaderMatch} from './FindUtils';

/** A match - a column header if `record` is null, else the cell of that record and column. */
interface FindMatch {
    colId: string;
    record: StoreRecord;
}

/** A cell the grid has focused, or a row node and column to step from. */
interface FocusedCell {
    node: IRowNode;
    colId: string;
}

/**
 * Position in the grid's display order, compared row first: headers are row -1, then the body rows
 * in order. A column of -1 is the start of a row.
 */
type FindKey = [row: number, col: number];

/**
 * Impl model for `GridFindField` in `cells` mode - finds matching column headers and cells and
 * moves between them, as Excel's Find does, selecting the row of each matching cell.
 *
 * Matches run in one sequence, as in Excel, where headers are the cells of the first row: matching
 * headers first, then matching cells row by row, left to right. Cells are matched on the text they
 * show, cached for each record - an updated record is a new instance, with no cached text.
 * @internal
 */
export class GridCellFindImplModel extends BaseGridFindImplModel {
    /** Matches in display order, or null if no query is applied. */
    @observableRef accessor matches: FindMatch[] = null;

    /** Index into `matches` of the active match, or null if none is active. */
    @observable accessor activeIdx: number = null;

    get matchMode(): FilterMatchMode {
        return this.componentProps.matchMode ?? 'any';
    }

    @computed
    get hasResults(): boolean {
        return !isEmpty(this.matches);
    }

    get countLabel(): string {
        const {matches, activeIdx} = this;
        if (!this.hasQuery || !matches) return null;
        return `${activeIdx == null ? 0 : activeIdx + 1}/${matches.length}`;
    }

    get activeMatch(): FindMatch {
        const {matches, activeIdx} = this;
        return activeIdx == null ? null : (matches?.[activeIdx] ?? null);
    }

    // Display-order positions of the records and columns searched by the latest update.
    private rowOrdinals = new Map<StoreRecordId, number>();
    private colOrdinals = new Map<string, number>();

    // Text shown by each cell, by record and then column.
    private textCache = new WeakMap<StoreRecord, Map<Column, string>>();

    // The grid's focused cell as of the latest step, to tell when the user has moved since.
    private lastFocus: FocusedCell = null;

    override onLinked() {
        super.onLinked();
        const {innerGridModel} = this;
        if (!innerGridModel) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
            return;
        }

        this.addReaction(
            {
                track: () => this.query,
                run: () => this.updateMatches(true),
                debounce: this.queryBuffer
            },
            {
                // Rows or columns that change in content, order or visibility change the matches.
                track: () => [
                    innerGridModel.agApi,
                    innerGridModel.store.records,
                    innerGridModel.sortBy,
                    innerGridModel.groupBy,
                    innerGridModel.columns,
                    innerGridModel.columnState,
                    innerGridModel.columnGroupState
                ],
                run: () => this.updateMatches(false),
                equals: 'shallow',
                debounce: this.queryBuffer
            },
            {
                track: () => [this.includeFields, this.excludeFields, this.matchMode],
                run: () => this.updateMatches(false),
                equals: compareStructural
            }
        );
    }

    selectNext() {
        this.step(true);
    }

    selectPrev() {
        this.step(false);
    }

    /**
     * Clear the query and focus the active match - its cell, or for a header, the cell of that
     * column in the focused row (else the first row).
     */
    @action
    endFind() {
        const match = this.activeMatch,
            agApi = this.innerGridModel?.agApi,
            rowIndex = agApi?.getFocusedCell()?.rowIndex ?? 0;

        this.query = null;
        this.clearMatches();
        if (!agApi || !match) return;

        if (match.record) {
            const node = agApi.getRowNode(match.record.agId);
            if (node?.rowIndex != null) {
                agApi.setFocusedCell(node.rowIndex, match.colId);
            }
        } else if (agApi.getDisplayedRowCount()) {
            agApi.ensureIndexVisible(rowIndex);
            agApi.setFocusedCell(rowIndex, match.colId);
        }
    }

    override destroy() {
        this.clearMatches();
        super.destroy();
    }

    //------------------------
    // Matching
    //------------------------
    /**
     * Find the matches for the current query. A new query moves to its first match from the
     * focused cell. Otherwise the grid has changed, and the active match is kept if it still
     * matches.
     */
    @action
    private updateMatches(isNewQuery: boolean) {
        const {query, innerGridModel: gridModel} = this,
            agApi = gridModel?.agApi;
        if (!query || !agApi) {
            this.clearMatches();
            return;
        }

        const regex = getFilterRegex(query, this.matchMode),
            agColumns = agApi.getAllDisplayedColumns(),
            activeFields = new Set(this.getActiveFields()),
            columns = compact(agColumns.map(it => gridModel.getColumn(it.getColId()))).filter(it =>
                activeFields.has(it.field)
            ),
            searchedIds = new Set(columns.map(it => it.colId)),
            records = gridModel.getSortedRecords(),
            prevActive = this.activeMatch,
            matches: FindMatch[] = [];

        agColumns.forEach(it => {
            const colId = it.getColId();
            if (searchedIds.has(colId) && this.headerMatches(it, regex)) {
                matches.push({colId, record: null});
            }
        });
        records.forEach(record => {
            columns.forEach(column => {
                if (regex.test(this.getText(record, column))) {
                    matches.push({colId: column.colId, record});
                }
            });
        });

        this.colOrdinals = new Map(agColumns.map((it, idx) => [it.getColId(), idx]));
        this.rowOrdinals = new Map(records.map((it, idx) => [it.id, idx]));
        this.matches = matches;

        if (isNewQuery) {
            // Stay on the active match while the user refines the query, unless they have moved.
            const focus = this.getFocusedCell(),
                anchor =
                    this.hasFocusMoved(focus) || !prevActive
                        ? this.getAnchorKey(focus)
                        : this.keyOf(prevActive);
            this.lastFocus = focus;
            this.setActive(this.findFrom(anchor, true, true), true);
        } else {
            const idx = prevActive ? matches.findIndex(it => isSameMatch(it, prevActive)) : -1;
            this.setActive(idx >= 0 ? idx : null, false);
        }
    }

    // True if the column's header, or that of any group above it, matches.
    private headerMatches(agColumn: AgColumn, regex: RegExp): boolean {
        const groupIds = [];
        for (let group = agColumn.getParent(); group; group = group.getParent()) {
            if (!group.isPadding()) groupIds.push(group.getGroupId());
        }
        return isHeaderMatch(this.innerGridModel, agColumn.getColId(), groupIds, regex);
    }

    private getText(record: StoreRecord, column: Column): string {
        let byColumn = this.textCache.get(record);
        if (!byColumn) this.textCache.set(record, (byColumn = new Map()));

        let ret = byColumn.get(column);
        if (ret === undefined) {
            ret = getCellText(column, record);
            byColumn.set(column, ret);
        }
        return ret;
    }

    @action
    private clearMatches() {
        this.matches = null;
        this.rowOrdinals = new Map();
        this.colOrdinals = new Map();
        this.setActive(null, false);
    }

    //------------------------
    // Moving between matches
    //------------------------
    /**
     * Move to the next or previous match - after the active match, or after the cell the user
     * last focused if they have moved since, as Excel steps from the active cell.
     */
    private step(forward: boolean) {
        const {matches, activeIdx} = this;
        if (isEmpty(matches)) return;

        const focus = this.getFocusedCell(),
            moved = this.hasFocusMoved(focus);
        this.lastFocus = focus;

        let idx: number;
        if (moved || activeIdx == null) {
            idx = this.findFrom(this.getAnchorKey(focus), forward, false);
        } else {
            idx = (activeIdx + (forward ? 1 : -1) + matches.length) % matches.length;
        }
        this.setActive(idx, true);
    }

    /**
     * Index of the first match after the anchor, or with `forward` false, the last match before
     * it - wrapping at either end. With no anchor, the first or last match.
     *
     * @param inclusive - true to accept a match at the anchor itself.
     */
    private findFrom(anchor: FindKey, forward: boolean, inclusive: boolean): number {
        const {matches} = this;
        if (isEmpty(matches)) return null;
        if (!anchor) return forward ? 0 : matches.length - 1;

        if (forward) {
            const idx = matches.findIndex(it => {
                const cmp = compareKeys(this.keyOf(it), anchor);
                return inclusive ? cmp >= 0 : cmp > 0;
            });
            return idx >= 0 ? idx : 0;
        }

        const idx = findLastIndex(matches, it => compareKeys(this.keyOf(it), anchor) < 0);
        return idx >= 0 ? idx : matches.length - 1;
    }

    private keyOf({record, colId}: FindMatch): FindKey {
        const col = this.colOrdinals.get(colId) ?? -1;
        return record ? [this.rowOrdinals.get(record.id) ?? -1, col] : [-1, col];
    }

    // Key of the focused cell, else the start of the selected row, else null.
    private getAnchorKey(focus: FocusedCell): FindKey {
        if (focus) {
            const {node, colId} = focus,
                col = this.colOrdinals.get(colId) ?? -1,
                row = this.getRowOrdinal(node);
            // A group row sits above its first record, so starts the row of that record.
            if (row != null) return [row, node.data ? col : -1];
        }

        const record = this.innerGridModel.selectedRecord,
            row = record ? this.rowOrdinals.get(record.id) : null;
        return row != null ? [row, -1] : null;
    }

    // Display-order position of a row - for a group row, that of its first record.
    private getRowOrdinal(node: IRowNode): number {
        const {rowOrdinals} = this;
        if (node.data) return rowOrdinals.get(node.data.id) ?? null;
        const ret = min(
            (node.allLeafChildren ?? [])
                .map(it => rowOrdinals.get(it.data?.id))
                .filter(it => !isNil(it))
        );
        return ret ?? null;
    }

    private getFocusedCell(): FocusedCell {
        const agApi = this.innerGridModel?.agApi,
            focused = agApi?.getFocusedCell();

        // A pinned row, such as a summary, is not searched. Focus there counts as no focus, so a
        // step moves on from the active match, else from the selected row.
        if (!focused || focused.rowPinned) return null;

        const node = agApi.getDisplayedRowAtIndex(focused.rowIndex);
        return node ? {node, colId: focused.column.getColId()} : null;
    }

    private hasFocusMoved(focus: FocusedCell): boolean {
        const last = this.lastFocus;
        return !!focus && (focus.node !== last?.node || focus.colId !== last?.colId);
    }

    //------------------------
    // Active match and marking
    //------------------------
    /**
     * Make a match active, marking it in the grid.
     * @param reveal - true to select the match's row, if the grid has selection enabled, and scroll
     *      the match into view, expanding any collapsed rows above it.
     */
    @action
    private setActive(idx: number, reveal: boolean) {
        this.activeIdx = idx;
        const match = this.activeMatch;
        this.markActive(match);
        if (match && reveal) this.revealAsync(match).catchDefault();
    }

    private async revealAsync({record, colId}: FindMatch) {
        const gridModel = this.innerGridModel;
        if (record) {
            await (gridModel.selModel.isEnabled
                ? gridModel.selectAsync(record)
                : gridModel.ensureRecordsVisibleAsync(record));
        }
        gridModel.agApi?.ensureColumnVisible(colId);
    }

    // Mark the active match for its cell's `xh-cell--find-active` rule, or its header's class.
    private markActive(match: FindMatch) {
        const gridModel = this.innerGridModel;
        if (!gridModel) return;

        const cell = match?.record ? {recordId: match.record.id, colId: match.colId} : null,
            headerColId = match && !match.record ? match.colId : null;

        if (!isEqual(cell, gridModel._findActiveCell)) {
            gridModel._findActiveCell = cell;
            this.refreshCells();
        }
        if (headerColId !== gridModel._findActiveHeader) {
            gridModel._findActiveHeader = headerColId;
            const {agApi} = gridModel;
            if (agApi && !agApi.isDestroyed()) agApi.refreshHeader();
        }
    }

    // Re-apply cell classes to the rendered cells. ag-Grid renders only those in view, and
    // re-renders a cell only if its value has changed.
    private refreshCells() {
        const agApi = this.innerGridModel?.agApi;
        if (agApi && !agApi.isDestroyed()) agApi.refreshCells();
    }
}

function isSameMatch(a: FindMatch, b: FindMatch): boolean {
    return a.colId === b.colId && a.record?.id === b.record?.id;
}

function compareKeys([rowA, colA]: FindKey, [rowB, colB]: FindKey): number {
    return rowA !== rowB ? rowA - rowB : colA - colB;
}
