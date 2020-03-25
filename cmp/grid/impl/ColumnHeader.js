/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {bindable, computed} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {debounced} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {clone, isEmpty, isFunction, isString, remove} from 'lodash';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * @private
 */
export const ColumnHeader = hoistCmp({
    displayName: 'ColumnHeader',
    className: 'xh-grid-header',
    model: false,

    render(props) {
        const impl = useLocalModel(() => new LocalModel(props));

        const sortIcon = () => {
            const activeGridSorter = impl.activeGridSorter;
            if (!activeGridSorter) return null;
            const {abs, sort} = activeGridSorter;

            let icon;
            if (sort === 'asc') {
                icon = abs ? Icon.arrowToTop({size: 'sm'}) : Icon.arrowUp({size: 'sm'});
            } else if (sort === 'desc') {
                icon = abs ? Icon.arrowToBottom({size: 'sm'}) : Icon.arrowDown({size: 'sm'});
            }
            return div({className: 'xh-grid-header-sort-icon', item: icon});
        };

        const menuIcon = () => {
            if (!props.enableMenu) return null;
            return div({
                className: 'xh-grid-header-menu-icon',
                item: impl.isFiltered ? Icon.filter() : Icon.bars(),
                ref: impl.menuButtonRef,
                onClick: (e) => {
                    e.stopPropagation();
                    props.showColumnMenu(impl.menuButtonRef.current);
                }
            });
        };

        const extraClasses = [
            impl.isFiltered ? 'xh-grid-header-filtered' : null,
            impl.activeGridSorter ? 'xh-grid-header-sorted' : null,
            impl.hasNonPrimarySort ? 'xh-grid-header-multisort' : null
        ];

        let headerName = props.displayName;
        if (impl.xhColumn && isFunction(impl.xhColumn.headerName)) {
            const {xhColumn, gridModel} = impl;
            headerName = xhColumn.headerName({column: xhColumn, gridModel});
        }

        return div({
            className: classNames(props.className, extraClasses),
            onClick: impl.onClick,
            onDoubleClick: impl.onDoubleClick,
            onTouchEnd: impl.onTouchEnd,
            items: [
                span(headerName),
                sortIcon(),
                menuIcon()
            ]
        });
    }
});


@HoistModel
class LocalModel {
    gridModel;
    xhColumn;
    agColumn;
    colId;
    menuButtonRef = createObservableRef();
    @bindable isFiltered = false;
    enableSorting;
    allowedSorts;
    sortIndex;

    _doubleClick = false;
    _lastTouch = Date.now();

    constructor({gridModel, xhColumn, column: agColumn, enableSorting}) {
        this.gridModel = gridModel;
        this.xhColumn = xhColumn;
        this.agColumn = agColumn;
        this.colId = agColumn.colId;
        this.isFiltered = agColumn.isFilterActive();
        this.enableSorting = enableSorting;

        this.allowedSorts = xhColumn.allowedSorts ?? (xhColumn.absSort ? [
            {sort: 'asc', abs: false},
            {sort: 'desc', abs: true},
            {sort: 'desc', abs: false}
        ] : [
            {sort: 'asc', abs: false},
            {sort: 'desc', abs: false}
        ]);

        this.allowedSorts = this.allowedSorts.map(sort => {
            if (isEmpty(sort)) sort = {sort: null};
            if (isString(sort)) sort = {sort: sort};
            return {...sort, colId: xhColumn.colId};
        });

        agColumn.addEventListener('filterChanged', this.onFilterChanged);
    }

    destroy() {
        this.agColumn.removeEventListener('filterChanged', this.onFilterChanged);
    }

    // Get any active sortBy for this column, or null
    @computed
    get activeGridSorter() {
        if (!this.gridModel || !this.enableSorting) return null; // ag-grid auto group column wont have a gridModel
        return this.gridModel.sortBy.find(it => it.colId === this.colId);
    }

    @computed
    get hasNonPrimarySort() {
        const {activeGridSorter} = this;
        return activeGridSorter ? this.gridModel.sortBy.indexOf(activeGridSorter) > 0 : false;
    }

    // Desktop click handling
    onClick = (e) => {
        if (XH.isMobile) return;
        this._doubleClick = false;
        this.updateSort(e.shiftKey);
    };

    onDoubleClick = () => {
        if (XH.isMobile) return;
        this._doubleClick = true;
        this.autosize();
    };

    // Mobile touch handling
    onTouchEnd = () => {
        if (!XH.isMobile) return;
        const time = Date.now();
        if (time - this._lastTouch < 300) {
            this._doubleClick = true;
            this.autosize();
        } else {
            this._doubleClick = false;
            this.updateSort();
        }
        this._lastTouch = time;
    };

    onFilterChanged = () => this.setIsFiltered(this.agColumn.isFilterActive());

    //-------------------
    // Implementation
    //-------------------
    @debounced(300)
    updateSort(shiftKey) {
        if (!this.enableSorting || !this.gridModel || this._doubleClick) return;

        const {gridModel, activeGridSorter, colId} = this,
            nextSortBy = this.getNextSortBy();

        // Add to existing sorters if holding shift, else replace
        let sortBy = shiftKey ? clone(gridModel.sortBy) : [];
        if (activeGridSorter) {
            remove(sortBy, it => it.colId === colId);
        }
        if (nextSortBy) {
            sortBy.push(nextSortBy);
        }

        gridModel.setSortBy(sortBy);
    }

    getNextSortBy() {
        const {allowedSorts, activeGridSorter} = this;
        this.sortIndex = activeGridSorter ? (this.sortIndex + 1) % allowedSorts.length : 0;

        return allowedSorts[this.sortIndex];
    }

    autosize() {
        this.gridModel?.autoSizeColumns(this.colId);
    }
}
