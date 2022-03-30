/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp, HoistModel, creates, managed} from '@xh/hoist/core';
import {div, span} from '@xh/hoist/cmp/layout';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {Column} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {columnHeaderFilter, ColumnHeaderFilterModel} from '@xh/hoist/dynamics/desktop';
import {createObservableRef} from '@xh/hoist/utils/react';
import {debounced} from '@xh/hoist/utils/js';
import {olderThan} from '@xh/hoist/utils/datetime';
import {filter, size, findIndex, isEmpty, isFunction, isFinite, isUndefined, isString} from 'lodash';
import classNames from 'classnames';

import {GridSorter} from './GridSorter';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * @private
 */
export const columnHeader = hoistCmp.factory({
    displayName: 'ColumnHeader',
    className: 'xh-grid-header',
    model: creates(() => ColumnHeaderModel),

    render({className, model, enableMenu, showColumnMenu, displayName}) {
        const {gridModel, xhColumn} = model,
            {isDesktop} = XH;

        const sortIcon = () => {
            const {abs, sort} = model.activeGridSorter ?? {};
            if (!sort) return null;

            let icon;
            if (sort === 'asc') {
                icon = abs ? Icon.arrowToTop() : Icon.arrowUp();
            } else if (sort === 'desc') {
                icon = abs ? Icon.arrowToBottom() : Icon.arrowDown();
            }
            return div({className: 'xh-grid-header-sort-icon', item: icon});
        };

        const menuIcon = () => {
            if (model.enableFilter) return columnHeaderFilter();
            if (!enableMenu) return null;
            return div({
                className: 'xh-grid-header-menu-icon',
                item: model.isAgFiltered ? Icon.filter() : Icon.bars(),
                ref: model.agFilterButtonRef,
                onClick: (e) => {
                    e.stopPropagation();
                    showColumnMenu(model.agFilterButtonRef.current);
                }
            });
        };

        const expandCollapseIcon = () => {
            const {xhColumn} = model;
            if (!xhColumn || !xhColumn.isTreeColumn || !xhColumn.headerHasExpandCollapse || !model.rootsWithChildren) {
                return null;
            }

            const icon = model.majorityIsExpanded ?
                Icon.angleDown({prefix: 'fal', size: 'lg'}) :
                Icon.angleRight({prefix: 'fal', size: 'lg'});

            return div({
                className: 'xh-grid-header-expand-collapse-icon',
                item: icon,
                onClick: isDesktop ? model.onExpandOrCollapse : null,
                onTouchStart: !isDesktop ? model.onExpandOrCollapse : null
            });
        };

        const extraClasses = [
            model.isFiltered ? 'xh-grid-header-filtered' : null,
            model.activeGridSorter ? 'xh-grid-header-sorted' : null,
            model.hasNonPrimarySort ? 'xh-grid-header-multisort' : null
        ];

        // `displayName` is the output of the Column `headerValueGetter` and should always be a string
        // If `xhColumn` is present, it can consulted for a richer `headerName`
        let headerElem = displayName;
        if (xhColumn) {
            headerElem = isFunction(xhColumn.headerName) ?
                xhColumn.headerName({column: xhColumn, gridModel}) :
                xhColumn.headerName;
        }

        // If no app tooltip dynamically toggle a tooltip to display elided header
        let onMouseEnter = null;
        if (isDesktop && isUndefined(xhColumn?.headerTooltip)) {
            onMouseEnter = ({target: el}) => {
                if (el.offsetWidth < el.scrollWidth) {
                    const title = isString(headerElem) ? headerElem : displayName;
                    el.setAttribute('title', title);
                } else {
                    el.removeAttribute('title');
                }
            };
        }

        return div({
            className:      classNames(className, extraClasses),
            onClick:        isDesktop  ? model.onClick : null,
            onDoubleClick:  isDesktop  ? model.onDoubleClick : null,
            onMouseDown:    isDesktop  ? model.onMouseDown : null,
            onTouchStart:   !isDesktop ? model.onTouchStart : null,
            onTouchEnd:     !isDesktop ? model.onTouchEnd : null,

            items: [
                expandCollapseIcon(),
                span({onMouseEnter, item: headerElem}),
                sortIcon(),
                menuIcon()
            ]
        });
    }
});


class ColumnHeaderModel extends HoistModel {

    get gridModel()     {return this.componentProps.gridModel}
    get xhColumn()      {return this.componentProps.xhColumn}
    get agColumn()      {return this.componentProps.column}
    get colId()         {return this.agColumn.colId}
    get enableSorting() {return this.xhColumn?.sortable}

    availableSorts;

    // Hoist Filtering
    enableFilter;
    @managed columnHeaderFilterModel;

    // AG Filtering
    @bindable isAgFiltered = false;
    agFilterButtonRef = createObservableRef();

    _doubleClick = false;
    _lastTouch = null;
    _lastTouchStart = null;
    _lastMouseDown = null;

    constructor() {
        super();
        makeObservable(this);
    }

    onLinked() {
        const {xhColumn, agColumn} = this,
            {filterModel} = this.gridModel;

        this.availableSorts = this.parseAvailableSorts();

        if (!XH.isMobileApp && xhColumn?.filterable && filterModel?.getFieldSpec(xhColumn.field)) {
            this.columnHeaderFilterModel = new ColumnHeaderFilterModel({filterModel, column: xhColumn});
            this.enableFilter = true;
        } else {
            this.isAgFiltered = agColumn.isFilterActive();
            agColumn.addEventListener('filterChanged', this.onFilterChanged);
        }
    }

    destroy() {
        this.agColumn.removeEventListener('filterChanged', this.onFilterChanged);
        super.destroy();
    }

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

    get isFiltered() {
        return this.isAgFiltered || this.columnHeaderFilterModel?.isFiltered;
    }

    // Ag-Grid's filter callback
    onFilterChanged = () => {
        this.setIsAgFiltered(this.agColumn.isFilterActive());
    }

    @computed
    get rootsWithChildren() {
        return filter(this.gridModel.store.rootRecords, it => !isEmpty(it.children)).length;
    }

    @computed
    get majorityIsExpanded() {
        const {expandState} = this.gridModel;
        return !isEmpty(expandState) && size(expandState) > this.rootsWithChildren/2;
    }

    // Desktop click handling
    onMouseDown = () => {
        this._lastMouseDown = Date.now();
    };

    onExpandOrCollapse = (e) => {
        const {gridModel, majorityIsExpanded} = this;

        e.stopPropagation();
        if (majorityIsExpanded) {
            gridModel.collapseAll();
        } else {
            gridModel.expandAll();
        }
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
    onTouchStart = () => {
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
            gridModel.autosizeAsync({columns: this.colId, showMask: true});
        }
    }

    parseAvailableSorts() {
        const {
            absSort = false,
            sortingOrder = absSort ? Column.ABS_DESC_FIRST : Column.ASC_FIRST,
            colId = this.colId
        } = this.xhColumn ?? {}; // Note xhColumn may be null for ag-Grid dynamic columns

        const ret = sortingOrder.map(spec => {
            if (isString(spec) || spec === null) spec = {sort: spec};
            return new GridSorter({...spec, colId});
        });

        return absSort ? ret : ret.filter(it => !it.abs);
    }
}
