/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistAppModel} from 'hoist';
import {div} from 'hoist/layout';
import {observer, action, toJS} from 'hoist/mobx';
import {defaults} from 'lodash';

import './ag-grid';
import {navigateSelection, agGridReact} from './ag-grid';
import './Grid.css';

/**
 * Grid Component
 */
@observer
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
        const model = this.model;
        return div({
            style: {flex: '1 1 auto'},
            cls: hoistAppModel.darkTheme ? 'ag-theme-dark' : 'ag-theme-fresh',
            item: agGridReact({
                rowData: toJS(model.records),
                columnDefs: model.columns,
                onSelectionChanged: this.onSelectionChanged,
                onGridSizeChanged: this.onGridSizeChanged,
                gridOptions: this.gridOptions
            })
        });
    }


    //------------------------
    // Implementation
    //------------------------
    get model() {return this.props.model}

    onGridSizeChanged = (ev) => {
        ev.api.sizeColumnsToFit();
    }

    @action
    onSelectionChanged = (ev) => {
        const selection = this.model.selection;
        selection.setRecords(ev.api.getSelectedRows());
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.gridOptions.api);
    }

}
export const grid = elemFactory(Grid);