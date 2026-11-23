/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel, GridModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {HoistModel} from '@xh/hoist/core';
import type {TextInputModel} from '@xh/hoist/desktop/cmp/input';
import type {
    AgColumn,
    CellFocusedEvent,
    FindChangedEvent,
    GridApi,
    GridOptions,
    IRowNode
} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, observable, observableRef} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {compact, isEmpty, isEqual, isString} from 'lodash';
import type {FindFieldControlsModel} from './FindFieldControls';
import type {FindHotkeyTarget} from './FindHotkeys';
import {registerFindHotkeyTarget, unregisterFindHotkeyTarget} from './FindHotkeys';
import {isHeaderMatch} from './FindUtils';

/** Cell a search steps away from - the focused cell, or the start of the selected row. */
interface FindAnchor {
    node: IRowNode;
    /** Index among displayed columns, or -1 for the start of the row. */
    colIdx: number;
}

/**
 * Matches run in one sequence, as in Excel, where headers are the cells of the first row:
 * matching column headers first, in display order, then ag-Grid Find's cell matches. Positions
 * in that sequence are 1-based throughout.
 *
 * @internal
 */
export class GridCellFindFieldImplModel
    extends HoistModel
    implements FindFieldControlsModel, FindHotkeyTarget
{
    override xhImpl = true;

    @bindable accessor query: string = null;

    /** ColIds of displayed columns whose header (or a parent group's) matches the query. */
    @observableRef accessor headerMatches: string[] = [];

    /** ag-Grid Find's count of matching cells, or null if no query is applied. */
    @observable accessor cellMatchCount: number = null;

    /** Index into `headerMatches` of the active header, or null if none is active. */
    @observable accessor activeHeaderIdx: number = null;

    /** ag-Grid Find's 1-based number of the active cell match, or 0 if none is active. */
    @observable accessor activeCellNum: number = 0;

    /** False if the grid lacks ag-Grid's FindModule. */
    @observable accessor isAvailable: boolean = true;

    inputRef = createObservableRef<TextInputModel>();

    // True once the user has focused a cell other than the active match, so the next step
    // starts from that cell rather than from the active match.
    private anchorMoved = false;
    private boundApi: GridApi = null;
    private appOnFindChanged: GridOptions['onFindChanged'] = null;
    private appOnCellFocused: GridOptions['onCellFocused'] = null;

    get queryBuffer(): number {
        return this.componentProps.queryBuffer ?? 200;
    }

    get hasFocus(): boolean {
        return this.inputRef?.current?.hasFocus;
    }

    @computed
    get hasQuery(): boolean {
        return !isEmpty(this.query);
    }

    @computed
    get totalMatches(): number {
        const {cellMatchCount} = this;
        return cellMatchCount == null ? null : this.headerMatches.length + cellMatchCount;
    }

    @computed
    get hasResults(): boolean {
        return this.totalMatches > 0;
    }

    @computed
    get activePosition(): number {
        const {activeHeaderIdx, activeCellNum} = this;
        if (activeHeaderIdx != null) return activeHeaderIdx + 1;
        return activeCellNum ? this.headerMatches.length + activeCellNum : 0;
    }

    get countLabel(): string {
        const {totalMatches} = this;
        return this.hasQuery && totalMatches != null
            ? `${this.activePosition}/${totalMatches}`
            : null;
    }

    /** Model to search - from props, or the nearest found in context. */
    @computed
    get boundModel(): GridLikeModel {
        return this.componentProps.gridModel ?? this.lookupModel(isGridLikeModel);
    }

    get gridModel(): GridModel {
        return this.boundModel?.innerGridModel ?? null;
    }

    //------------------------
    // FindHotkeyTarget
    //------------------------
    get canFocus(): boolean {
        const el = this.inputRef.current?.domEl;
        return this.isAvailable && !!this.boundApi && !!el && el.getClientRects().length > 0;
    }

    contains(el: Element): boolean {
        return !!(
            this.inputRef.current?.domEl?.contains(el) ||
            this.boundApi?.getGridElement()?.contains(el)
        );
    }

    focusInput() {
        const input = this.inputRef.current;
        input?.focus();
        input?.select();
    }

    override onLinked() {
        if (!this.gridModel) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
            return;
        }

        this.addReaction(
            {
                track: () => !!this.componentProps.enableHotkey,
                run: enable =>
                    enable ? registerFindHotkeyTarget(this) : unregisterFindHotkeyTarget(this),
                fireImmediately: true
            },
            {
                track: () => this.gridModel.agApi,
                run: api => this.bindApi(api),
                fireImmediately: true
            },
            {
                track: () => this.query,
                run: () => this.applyQuery(),
                debounce: this.queryBuffer
            },
            {
                // Columns shown, hidden, moved or renamed change which headers match.
                track: () => [this.gridModel.columns, this.gridModel.columnState],
                run: () => this.updateHeaderMatches(),
                debounce: 0
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
        const api = this.boundApi,
            {gridModel} = this,
            cell = gridModel?._findActiveCell,
            headerColId = gridModel?._findActiveHeader,
            rowIndex = api?.getFocusedCell()?.rowIndex ?? 0;

        this.query = null;
        this.applyQuery();
        if (!api) return;

        if (cell?.node.rowIndex != null) {
            api.setFocusedCell(cell.node.rowIndex, cell.colId, cell.node.rowPinned);
        } else if (headerColId && api.getDisplayedRowCount()) {
            api.ensureIndexVisible(rowIndex);
            api.setFocusedCell(rowIndex, headerColId);
        }
    }

    override destroy() {
        unregisterFindHotkeyTarget(this);
        this.bindApi(null);
        super.destroy();
    }

    //------------------------
    // Implementation
    //------------------------
    private bindApi(api: GridApi) {
        const {boundApi} = this;
        this.setActiveCell(null);
        this.setActiveHeader(null);
        if (boundApi && !boundApi.isDestroyed()) {
            boundApi.setGridOption('onFindChanged', this.appOnFindChanged);
            boundApi.setGridOption('onCellFocused', this.appOnCellFocused);
            boundApi.setGridOption('findSearchValue', null);
        }
        this.boundApi = this.appOnFindChanged = this.appOnCellFocused = null;
        if (!api) return;

        if (!api.isModuleRegistered('FindModule')) {
            this.logError(
                "GridCellFindField requires ag-Grid's FindModule (ag-grid-enterprise) to be " +
                    'registered. Find is disabled.'
            );
            this.setAvailable(false);
            return;
        }

        this.setAvailable(true);
        // Listen via grid options, which need no ag-Grid EventApiModule, keeping any handler the
        // app has set.
        const appOnFindChanged = api.getGridOption('onFindChanged'),
            appOnCellFocused = api.getGridOption('onCellFocused');
        this.boundApi = api;
        this.appOnFindChanged = appOnFindChanged;
        this.appOnCellFocused = appOnCellFocused;
        api.setGridOption('onFindChanged', e => {
            this.onFindChanged(e);
            appOnFindChanged?.(e);
        });
        api.setGridOption('onCellFocused', e => {
            this.onCellFocused(e);
            appOnCellFocused?.(e);
        });
        this.applyQuery();
    }

    private applyQuery() {
        const api = this.boundApi;
        if (!api) return;

        const {hasQuery} = this;
        this.setActiveHeader(null);
        api.setGridOption('findSearchValue', hasQuery ? this.query : null);
        this.updateHeaderMatches();
        if (hasQuery) this.step(true, true);
    }

    /**
     * Move to the next or previous match - after the active match, or after the cell the user
     * last focused if they have moved since, as Excel steps from the active cell.
     *
     * @param forward - true to step forward, false to step back.
     * @param includeAnchor - true to accept a match in the focused cell itself, so a query
     *      refined while typing stays on a cell that still matches.
     */
    private step(forward: boolean, includeAnchor = false) {
        const api = this.boundApi;
        if (!api) return;

        this.updateHeaderMatches();
        const headerCount = this.headerMatches.length,
            total = headerCount + api.findGetTotalMatches();
        if (!total) return;

        const {activePosition} = this,
            anchor = this.anchorMoved || !activePosition ? this.getAnchor() : null;
        this.anchorMoved = false;

        let target: number;
        if (anchor) {
            // Headers sit above every row, so a step from a cell reaches them only by wrapping.
            target = forward
                ? headerCount + this.countMatchesBefore(anchor, !includeAnchor) + 1
                : headerCount + this.countMatchesBefore(anchor, false);
        } else if (activePosition) {
            target = activePosition + (forward ? 1 : -1);
        } else {
            target = forward ? 1 : total;
        }
        if (target > total) target = 1;
        if (target < 1) target = total;

        this.goTo(target, forward);
    }

    private goTo(position: number, forward: boolean) {
        const api = this.boundApi,
            {headerMatches} = this;

        if (position <= headerMatches.length) {
            const colId = headerMatches[position - 1];
            if (api.findGetActiveMatch()) api.findClearActive();
            this.setActiveHeader(colId);
            api.ensureColumnVisible(colId);
            return;
        }

        const cellNum = position - headerMatches.length;
        this.setActiveHeader(null);
        api.findGoTo(cellNum, true);

        // Fall back to ag-Grid's own stepping should a jump by number miss.
        if (api.findGetActiveMatch()?.numOverall !== cellNum) {
            forward ? api.findNext() : api.findPrevious();
        }
    }

    private getAnchor(): FindAnchor {
        const api = this.boundApi,
            focused = api.getFocusedCell();

        if (focused) {
            const {rowIndex, rowPinned, column} = focused,
                node =
                    rowPinned === 'top'
                        ? api.getPinnedTopRow(rowIndex)
                        : rowPinned === 'bottom'
                          ? api.getPinnedBottomRow(rowIndex)
                          : api.getDisplayedRowAtIndex(rowIndex);
            if (node) return {node, colIdx: api.getAllDisplayedColumns().indexOf(column)};
        }

        const record = this.gridModel.selectedRecord,
            node = record ? api.getRowNode(record.agId) : null;
        return node ? {node, colIdx: -1} : null;
    }

    /**
     * Count the matches ag-Grid orders before the anchor cell, walking rows in its order -
     * pinned top, then all rows after filter and sort, then pinned bottom.
     *
     * @param inclusive - true to also count the matches within the anchor cell.
     */
    private countMatchesBefore(anchor: FindAnchor, inclusive: boolean): number {
        const api = this.boundApi,
            columns = api.getAllDisplayedColumns();

        let ret = 0,
            done = false;
        const visit = (node: IRowNode) => {
            if (done || !node) return;
            const atAnchor = node === anchor.node;
            columns.forEach((column, idx) => {
                if (atAnchor && (idx > anchor.colIdx || (idx === anchor.colIdx && !inclusive))) {
                    return;
                }
                ret += api.findGetNumMatches({node, column});
            });
            if (atAnchor) done = true;
        };

        for (let i = 0; i < api.getPinnedTopRowCount(); i++) visit(api.getPinnedTopRow(i));
        api.forEachNodeAfterFilterAndSort(visit);
        for (let i = 0; i < api.getPinnedBottomRowCount(); i++) visit(api.getPinnedBottomRow(i));
        return ret;
    }

    //------------------------
    // Header matching
    //------------------------
    @action
    private updateHeaderMatches() {
        const api = this.boundApi,
            query = this.query?.toLowerCase(),
            matches =
                api && query
                    ? api
                          .getAllDisplayedColumns()
                          .filter(it => this.headerMatchesQuery(it, query))
                          .map(it => it.getColId())
                    : [];

        if (isEqual(matches, this.headerMatches)) return;
        this.headerMatches = matches;

        const active = this.gridModel._findActiveHeader;
        if (active && !matches.includes(active)) this.setActiveHeader(null);
    }

    // True if the column's header, or that of any group above it, contains the query.
    private headerMatchesQuery(agColumn: AgColumn, query: string): boolean {
        const groupIds = [];
        for (let group = agColumn.getParent(); group; group = group.getParent()) {
            if (!group.isPadding()) groupIds.push(group.getGroupId());
        }
        return isHeaderMatch(this.gridModel, agColumn.getColId(), groupIds, query);
    }

    //------------------------
    // Active match state
    //------------------------
    private onFindChanged = (e: FindChangedEvent) => {
        const {activeMatch} = e,
            column = activeMatch?.column;

        this.setCellMatchState(e.totalMatches, activeMatch?.numOverall ?? 0);
        this.setActiveCell(
            activeMatch && column ? {node: activeMatch.node, colId: column.getColId()} : null
        );
    };

    private onCellFocused = (e: CellFocusedEvent) => {
        const cell = this.gridModel._findActiveCell,
            colId = isString(e.column) ? e.column : e.column?.getColId();

        this.anchorMoved = !(
            cell &&
            cell.colId === colId &&
            cell.node.rowIndex === e.rowIndex &&
            (cell.node.rowPinned ?? null) === (e.rowPinned ?? null)
        );
    };

    // Mark the active cell for each Column's `xh-cell--find-active` rule, refreshing the cells
    // that gain or lose the mark.
    private setActiveCell(cell: GridModel['_findActiveCell']) {
        const {gridModel, boundApi} = this;
        if (!gridModel) return;

        const prev = gridModel._findActiveCell;
        if (prev?.node === cell?.node && prev?.colId === cell?.colId) return;

        gridModel._findActiveCell = cell;
        if (boundApi && !boundApi.isDestroyed()) {
            const cells = compact([prev, cell]);
            boundApi.refreshCells({
                rowNodes: cells.map(it => it.node),
                columns: cells.map(it => it.colId),
                force: true,
                suppressFlash: true
            });
        }
    }

    // Mark the active header for its `xh-column-header--find-active` class.
    @action
    private setActiveHeader(colId: string) {
        const {gridModel, boundApi} = this;
        if (!gridModel) return;

        this.activeHeaderIdx = colId ? this.headerMatches.indexOf(colId) : null;
        if (gridModel._findActiveHeader === colId) return;

        gridModel._findActiveHeader = colId;
        if (boundApi && !boundApi.isDestroyed()) boundApi.refreshHeader();
    }

    @action
    private setCellMatchState(cellMatchCount: number, activeCellNum: number) {
        this.cellMatchCount = this.hasQuery ? cellMatchCount : null;
        this.activeCellNum = activeCellNum;
    }

    @action
    private setAvailable(isAvailable: boolean) {
        this.isAvailable = isAvailable;
    }
}
