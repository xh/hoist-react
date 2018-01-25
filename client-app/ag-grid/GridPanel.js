/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'ag-grid-enterprise';
import 'ag-grid/dist/styles/ag-grid.css';
import 'ag-grid/dist/styles/ag-theme-fresh.css';

import {Component} from 'react';
import {merge} from 'lodash';
import {elem, elemFactory} from 'hoist';
import {div} from 'hoist/layout';
import {AgGridReact} from 'ag-grid-react';
import {LicenseManager} from 'ag-grid-enterprise';
import {observer} from 'hoist/mobx';

LicenseManager.setLicenseKey(
    'ag-Grid_Evaluation_License_Key_Not_for_Production_100Devs15_February_2018__MTUxODY1MjgwMDAwMA==600d5a723b746ad55afff76eb446f0ad'
);

@observer
class GridPanel extends Component {

    render() {
        const opts = {
                enableSorting: true,
                rowSelection: 'single'
            },
            gridOptions = merge(opts, this.props.gridOptions);

        return div({
            style: {flex: '1 1 auto'},
            cls: 'ag-theme-fresh',
            items: elem(AgGridReact, {
                onRowDataChanged: this.onRowDataChanged,
                onSelectionChanged: this.onSelectionChanged,
                gridOptions: gridOptions,
                rowData: this.props.rows,
                items: this.props.columns
            })
        });
    }

    onRowDataChanged = (ev) => {
        ev.api.sizeColumnsToFit();
    }

    @action
    onSelectionChanged = (ev) => {
        const sel = this.props.selectionState;
        if (sel) sel.selection = ev.api.getSelectedRows();
    }
}

export const gridPanel = elemFactory(GridPanel);