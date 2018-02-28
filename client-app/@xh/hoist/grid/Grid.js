/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {div, frame} from 'hoist/layout';
import {toJS, whyRun} from 'hoist/mobx';
import {defaults} from 'lodash';

import './ag-grid';
import {navigateSelection, agGridReact} from './ag-grid';
import './Grid.css';

/**
 * Grid Component
 */
@hoistComponent()
class Grid extends Component {

    static gridDefaults = {
        enableSorting: true,
        enableColResize: true,
        rowSelection: 'single'
    };

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
                style: {flex: '1 1 auto'},
                cls: this.darkTheme ? 'ag-theme-dark' : 'ag-theme-fresh',
                item: agGridReact({
                    rowData: toJS(store.records),
                    columnDefs: columns,
                    onSelectionChanged: this.onSelectionChanged,
                    onGridSizeChanged: this.onGridSizeChanged,
                    gridOptions: this.gridOptions
                })
            })
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onGridSizeChanged = (ev) => {
        ev.api.sizeColumnsToFit();
    }
    
    onSelectionChanged = (ev) => {
        const selection = this.model.selection;
        selection.setRecords(ev.api.getSelectedRows());
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.gridOptions.api);
    }
}
export const grid = elemFactory(Grid);