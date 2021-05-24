import {Column} from '@xh/hoist/cmp/grid';
import {FilterPopoverModel} from '@xh/hoist/cmp/grid/impl/FilterPopoverModel';
import {GridSorter} from '@xh/hoist/cmp/grid/impl/GridSorter';
import {HoistModel} from '@xh/hoist/core';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {olderThan} from '@xh/hoist/utils/datetime';
import {debounced} from '@xh/hoist/utils/js';
import {filter, findIndex, isEmpty, isFinite, isString} from 'lodash';
import {action, observable} from 'mobx';

export class ColumnHeaderModel extends HoistModel {
    @observable.ref gridModel;
    @observable.ref xhColumn;
    agColumn;
    colId;
    availableSorts;
    @observable enableSorting;
    @observable enableFilter;
    filterPopoverModel;

    _doubleClick = false;
    _lastTouch = null;
    _lastTouchStart = null;
    _lastMouseDown = null;

    _initCalled = false;

    //-------------------
    // Sorting
    //-------------------
    // Get any active sortBy for this column, or null
    @computed
    get activeGridSorter() {
        if (!this.gridModel || !this.enableSorting) return null; // ag-grid auto group column won't have a gridModel
        return this.gridModel.sortBy.find(it => it.colId === this.colId);
    }

    @computed
    get hasNonPrimarySort() {
        const {activeGridSorter} = this;
        return activeGridSorter ? this.gridModel.sortBy.indexOf(activeGridSorter) > 0 : false;
    }

    // Desktop click handling
    onMouseDown = (e) => {
        this._lastMouseDown = Date.now();
    };

    onClick = (e) => {
        if (olderThan(this._lastMouseDown, 500)) return;  // avoid spurious reaction to drag end.
        this._doubleClick = false;
        this.updateSort(e.shiftKey);
    };

    onDoubleClick = () => {
        this._doubleClick = true;
        this.autosize();
    };

    // Mobile touch handling
    onTouchStart = (e) => {
        this._lastTouchStart = Date.now();
    };

    onTouchEnd = () => {
        if (olderThan(this._lastTouchStart, 500)) return;  // avoid spurious reaction to drag end.

        if (!olderThan(this._lastTouch, 300)) {
            this._doubleClick = true;
            this.autosize();
        } else {
            this._doubleClick = false;
            this.updateSort();
        }

        this._lastTouch = Date.now();
    };

    //-------------------
    // Implementation
    //-------------------
    constructor() {
        super();
        makeObservable(this);
    }

    @action
    init({gridModel, xhColumn, column: agColumn}) {
        // Avoid multiple calls, which can occur if ColumnHeader remounted.
        if (this._initCalled) return;
        this._initCalled = true;

        this.gridModel = gridModel;
        this.xhColumn = xhColumn;
        this.agColumn = agColumn;
        this.colId = agColumn.colId;
        this.availableSorts = this.parseAvailableSorts();
        const {sortable, enableFilter, field} = xhColumn;
        this.enableSorting = sortable;

        if (enableFilter && field === this.colId) {
            this.filterPopoverModel = new FilterPopoverModel({gridModel, xhColumn, agColumn});
            this.enableFilter = true;
        }
    }

    @debounced(300)
    updateSort(shiftKey) {
        if (!this.enableSorting || !this.gridModel || this._doubleClick) return;

        const {gridModel, activeGridSorter, colId} = this;

        let sortBy;
        if (shiftKey) {
            // For shift, modify sorters
            sortBy = filter(gridModel.sortBy, it => it.colId !== colId);
            // Add new sort if this was a complex sort or no sort on this column.
            if (!activeGridSorter || !isEmpty(sortBy)) {
                const nextSortBy = this.getNextSortBy();
                if (nextSortBy) sortBy.push(nextSortBy);
            }
        } else {
            // Otherwise straightforward replace
            const nextSortBy = this.getNextSortBy();
            sortBy = nextSortBy ? [nextSortBy] : [];
        }
        gridModel.setSortBy(sortBy);
    }

    getNextSortBy() {
        const {availableSorts, activeGridSorter} = this;
        if (!availableSorts.length) return null;

        let idx = 0;
        if (activeGridSorter) {
            const {colId, sort, abs} = activeGridSorter,
                currIdx = findIndex(availableSorts, {colId, sort, abs});

            if (isFinite(currIdx)) idx = (currIdx + 1) % availableSorts.length;
        }


        return availableSorts[idx];
    }

    autosize() {
        const {gridModel} = this;
        if (gridModel?.autosizeEnabled) {
            gridModel.autosizeAsync({columns: this.colId, showMask: false});
        }
    }

    parseAvailableSorts() {
        const {
            absSort = false,
            sortingOrder = Column.DEFAULT_SORTING_ORDER,
            colId = this.colId
        } = this.xhColumn ?? {}; // Note xhColumn may be null for ag-Grid dynamic columns

        const ret = sortingOrder.map(spec => {
            if (isString(spec) || spec === null) spec = {sort: spec};
            return new GridSorter({...spec, colId});
        });
        return absSort ? ret : ret.filter(it => !it.abs);
    }
}
