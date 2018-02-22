/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {grid} from 'hoist/grid';
import {observer} from 'hoist/mobx';
import {frame, vframe} from 'hoist/layout';
import {confirm} from 'hoist/cmp/confirm/Confirm.js';
import {restGridToolbar} from './RestGridToolbar';
import {restForm} from './RestForm';

@observer
export class RestGrid extends Component {

    render() {
        const model = this.model;
        return vframe(
            restGridToolbar({model}),
            frame(
                grid({
                    model: model.gridModel,
                    gridOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked,
                        getContextMenuItems: this.getContextMenuItems
                    }
                })
            ),
            restForm({model: model.formModel}),
            confirm({model: model.confirmModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    get model() {return this.props.model}

    onRowDoubleClicked = (row) => {
        this.model.formModel.openEdit(row.data);
    }

    // probably going to need a fat arrow to access info in model
    // actually the items probably belong in the model.
    getContextMenuItems(params) {
        console.log(params);
        return [
            {
                name: 'Add Record',
                action: () => console.log('Would launch add form'),
                tooltip: 'Add record'
            },
            {
                name: 'Edit Record',
                action: () => console.log('Would launch edit form'),
                tooltip: 'Edit record'
            },
            {
                name: 'Delete Record',
                action: () => console.log('Would trigger confirm'),
                tooltip: 'Delete record'
            },
            'separator',
            {
                name: 'Rest',
                subMenu: [
                    {
                        name: 'Add Record',
                        action: () => console.log('Would launch add form'),
                        tooltip: 'Add record'
                    },
                    {
                        name: 'Edit Record',
                        action: () => console.log('Would launch edit form'),
                        tooltip: 'Edit record'
                    },
                    {
                        name: 'Delete Record',
                        action: () => console.log('Would trigger confirm'),
                        tooltip: 'Delete record'
                    }
                ],
                tooltip: 'Demoing nested menus'
            },
            'separator',
            'export' // default option provided by ag-grid
        ];
    }
}

export const restGrid = elemFactory(RestGrid);