/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {createObservableRef} from '@xh/hoist/utils/react';
import {div, span} from '@xh/hoist/cmp/layout';
import {observable, computed, action} from '@xh/hoist/mobx';
import {clone, remove} from 'lodash';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * @private
 */
@HoistComponent
export class ColumnHeader extends Component {

    gridModel;
    xhColumn;
    agColumn;
    colId;

    menuButtonRef = createObservableRef();

    baseClassName = 'xh-grid-header';

    @observable isFiltered = false;

    // Get any active sortBy for this column, or null
    @computed
    get activeGridSorter() {
        if (!this.gridModel) return; // ag-grid auto group column wont have a gridModel

        return this.gridModel.sortBy.find(it => {
            return it.colId === this.colId;
        });
    }

    @computed
    get hasNonPrimarySort() {
        const {activeGridSorter} = this;
        return activeGridSorter ? this.gridModel.sortBy.indexOf(activeGridSorter) > 0 : false;
    }

    constructor(props) {
        super(props);
        const {gridModel, xhColumn, column} = this.props;
        this.gridModel = gridModel;
        this.xhColumn = xhColumn;
        this.agColumn = column;
        this.colId = column.colId;
        this.isFiltered = column.isFilterActive();
        column.addEventListener('filterChanged', () => this.onFilterChanged());
    }

    render() {
        const {displayName} = this.props,
            classNames = [
                this.isFiltered ? 'xh-grid-header-filtered' : null,
                this.activeGridSorter ? 'xh-grid-header-sorted' : null,
                this.hasNonPrimarySort ? 'xh-grid-header-multisort' : null
            ];

        return div({
            className: this.getClassName(...classNames),
            onClick: this.onClick,
            onTouchEnd: this.onClick,
            items: [
                span(displayName),
                this.renderSortIcon(),
                this.renderMenuIcon()
            ]
        });
    }

    renderSortIcon() {
        const {props, activeGridSorter} = this,
            {enableSorting} = props;

        if (!enableSorting || !activeGridSorter) return null;

        let icon;
        if (activeGridSorter.abs) {
            icon = Icon.arrowToBottom();
        } else if (activeGridSorter.sort === 'asc') {
            icon = Icon.arrowUp({size: 'sm'});
        } else if (activeGridSorter.sort === 'desc') {
            icon = Icon.arrowDown({size: 'sm'});
        }

        return div({
            className: 'xh-grid-header-sort-icon',
            item: icon
        });
    }

    renderMenuIcon() {
        const {enableMenu, showColumnMenu} = this.props;
        if (!enableMenu) return null;

        return div({
            className: 'xh-grid-header-menu-icon',
            item: this.isFiltered ? Icon.filter() : Icon.bars(),
            ref: this.menuButtonRef,
            onClick: (e) => {
                e.stopPropagation();
                showColumnMenu(this.menuButtonRef.current);
            }
        });
    }

    //--------------------
    // Implementation
    //--------------------
    onClick = (e) => {
        if (!this.props.enableSorting || !this.gridModel) return;

        const {gridModel, activeGridSorter, colId} = this,
            nextSortBy = this.getNextSortBy();

        // Add to existing sorters if holding shift, else replace
        let sortBy = e.shiftKey ? clone(gridModel.sortBy) : [];
        if (activeGridSorter) {
            remove(sortBy, it => it.colId == colId);
        }
        if (nextSortBy) {
            sortBy.push(nextSortBy);
        }

        this.gridModel.setSortBy(sortBy);
    }

    @action
    onFilterChanged = () => {
        this.isFiltered = this.agColumn.isFilterActive();
    };

    getNextSortBy() {
        const {colId, xhColumn, activeGridSorter} = this,
            {sort, abs = false} = activeGridSorter || {};

        if (sort === 'asc') {
            return {colId, sort: 'desc', abs: false};
        } else if (xhColumn.absSort && !abs && (!activeGridSorter || sort === 'desc')) {
            return {colId, sort: 'desc', abs: true};
        } else {
            return {colId, sort: 'asc', abs: false};
        }
    }

}