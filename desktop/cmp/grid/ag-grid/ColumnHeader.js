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
 * A custom ag-grid header component.
 *
 * ColumnHeader offers support for absolute sorting, by rendering custom sort icons
 * and using the Column.absSort to determine the next sortBy.
 *
 * @private
 */
@HoistComponent
export class ColumnHeader extends Component {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {GridModel} */
    gridModel;
    /** @member {string} */
    colId;

    menuButton = new Ref();

    @computed
    get colDef() {
        return this.gridModel.findColumn(this.gridModel.columns, this.colId);
    }

    @computed
    get currentSort() {
        return this.gridModel.sortBy.find(it => {
            return it.colId === this.colId;
        });
    }

    constructor(props) {
        super(props);
        const {gridModel, column} = this.props;
        this.gridModel = gridModel;
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
        const {props, currentSort} = this,
            {enableSorting} = props;

        if (!enableSorting || !currentSort) return null;

        if (currentSort.abs) {
            return Icon.arrowToBottom();
        } else if (currentSort.sort === 'asc') {
            return Icon.arrowUp({size: 'sm'});
        } else if (currentSort.sort === 'desc') {
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

        const {gridModel, colId, currentSort} = this,
            nextSortBy = this.getNextSortBy();

        // Add to existing sorters if holding shift, else replace
        let sortBy = e.shiftKey ? clone(gridModel.sortBy) : [];
        if (currentSort) {
            sortBy = sortBy.filter(it => it.colId !== colId);
        }
        if (nextSortBy) {
            sortBy.push(nextSortBy);
        }

        this.gridModel.setSortBy(sortBy);
    }

    getNextSortBy() {
        const {colId, colDef, currentSort} = this,
            {sort, abs = false} = currentSort || {};

        if (!currentSort) {
            return {colId, sort: 'asc', abs: false};
        } else if (sort === 'asc') {
            return {colId, sort: 'desc', abs: false};
        } else if (sort === 'desc' && colDef.absSort && !abs) {
            return {colId, sort: 'desc', abs: true};
        } else {
            return null;
        }
    }

}