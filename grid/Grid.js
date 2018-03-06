/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {div, frame} from 'hoist/layout';
import {toJS} from 'hoist/mobx';
import {defaults} from 'lodash';

import './ag-grid';
import {navigateSelection, agGridReact} from './ag-grid';
import './Grid.css';

/**
 * Grid Component.
 */
@hoistComponent()
class Grid extends Component {

    static gridDefaults = {
        enableSorting: true,
        enableColResize: true,
        rowSelection: 'single'
    };

    static getDefaultContextMenu() {
        return new GridContextMenu([
            'autoSizeAll',
            '-',
            'copy'
        ]);
    }

    constructor(props) {
        super(props);
        this.gridOptions = defaults(
            props.gridOptions || {},
            Grid.gridDefaults,
            {navigateToNextCell: this.onNavigateToNextCell}
        );
    }

    render() {
        const {store, columns} = this.model;
        return frame(
            div({
                style: {flex: '1 1 auto', overflow: 'hidden'},
                cls: this.darkTheme ? 'ag-theme-dark' : 'ag-theme-fresh',
                item: agGridReact({
                    rowData: toJS(store.records),
                    columnDefs: columns,
                    onSelectionChanged: this.onSelectionChanged,
                    gridOptions: this.gridOptions,
                    getContextMenuItems: this.getContextMenuItems
                })
            })
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onSelectionChanged = (ev) => {
        const selection = this.model.selection;
        selection.setRecords(ev.api.getSelectedRows());
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.gridOptions.api);
    }

    getContextMenuItems = (params) => {
        // Get the hoist menu, and translate to a set of AG items.
        const hoistMenu = this.props.getContextMenu || this.constructor.getDefaultContextMenu();

        const agItems = hoistMenu.items.map((it) => {
            if ('-') return 'divider';
            if (isString(it)) return it;

            return {
                   name: it.action,
                   icon: it.icon,
                
                }
        })
    }



}
export const grid = elemFactory(Grid);