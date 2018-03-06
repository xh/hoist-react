/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {div, frame} from 'hoist/layout';
import {autorun, toJS} from 'hoist/mobx';
import {defaults, differenceBy} from 'lodash';

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
        selection.select(ev.api.getSelectedRows());
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.gridOptions.api);
    }

    getContextMenuItems = () => {
        return [];
    }

    componentDidMount() {
        this.disposeRunner = autorun(() => {
            const api = this.gridOptions.api,
                modelSelection = this.model.selection.records,
                gridSelection = api.getSelectedRows(),
                diff = differenceBy(modelSelection, gridSelection, 'id');

            // If ag-grid's selection differs from the selection model,
            // set ag-grid selected nodes to match the selection model
            if (diff.length > 0) {
                api.deselectAll();
                modelSelection.forEach((record) => {
                    const node = api.getRowNode(record.id);
                    node.setSelected(true);
                    api.ensureNodeVisible(node);
                });
            }
        });
    }

    componentWillUnmount() {
        this.disposeRunner();
    }
}
export const grid = elemFactory(Grid);