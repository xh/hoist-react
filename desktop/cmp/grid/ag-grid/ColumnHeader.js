/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Ref} from '@xh/hoist/utils/react';
import {div, span} from '@xh/hoist/cmp/layout';
import {computed} from '@xh/hoist/mobx';
import {clone} from 'lodash';

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

    //------------------------
    // Immutable public properties
    //------------------------
    gridModel;
    column;
    colId;

    menuButton = new Ref();

    // Get any active sortBy for this column, or null
    @computed
    get activeGridSorter() {
        return this.gridModel.sortBy.find(it => {
            return it.colId === this.colId;
        });
    }

    constructor(props) {
        super(props);
        const {gridModel, column} = this.props;
        this.gridModel = gridModel;
        this.column = column;
        this.colId = column.colId;
    }

    render() {
        const {displayName} = this.props;

        return div({
            className: 'xh-grid-header',
            onClick: this.onClick,
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

        if (activeGridSorter.abs) {
            return Icon.arrowToBottom();
        } else if (activeGridSorter.sort === 'asc') {
            return Icon.arrowUp({size: 'sm'});
        } else if (activeGridSorter.sort === 'desc') {
            return Icon.arrowDown({size: 'sm'});
        }
        return null;
    }

    renderMenuIcon() {
        const {enableMenu, showColumnMenu} = this.props;
        if (!enableMenu) return null;

        return div({
            item: Icon.bars(),
            ref: this.menuButton.ref,
            onClick: (e) => {
                e.stopPropagation();
                showColumnMenu(this.menuButton.value);
            }
        });
    }

    //--------------------
    // Implementation
    //--------------------
    onClick = (e) => {
        if (!this.props.enableSorting) return;

        const {gridModel, activeGridSorter, colId} = this,
            nextSortBy = this.getNextSortBy();

        // Add to existing sorters if holding shift, else replace
        let sortBy = e.shiftKey ? clone(gridModel.sortBy) : [];
        if (activeGridSorter) {
            sortBy = sortBy.filter(it => it.colId !== colId);
        }
        if (nextSortBy) {
            sortBy.push(nextSortBy);
        }

        this.gridModel.setSortBy(sortBy);
    }

    getNextSortBy() {
        const {colId, column, activeGridSorter} = this,
            {sort, abs = false} = activeGridSorter || {};

        if (!activeGridSorter) {
            return {colId, sort: 'asc', abs: false};
        } else if (sort === 'asc') {
            return {colId, sort: 'desc', abs: false};
        } else if (sort === 'desc' && column.absSort && !abs) {
            return {colId, sort: 'desc', abs: true};
        } else {
            return null;
        }
    }

}