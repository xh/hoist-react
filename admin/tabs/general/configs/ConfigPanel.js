/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, HoistComponent} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';
import {boolCheckCol} from '@xh/hoist/columns';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import {configDiffer} from './differ/ConfigDiffer';
import {ConfigDifferModel} from './differ/ConfigDifferModel';

@HoistComponent
export class ConfigPanel extends Component {

    gridModel = new RestGridModel({
        stateModel: 'xhConfigGrid',
        enableColChooser: true,
        enableExport: true,
        store: new RestStore({
            url: 'rest/configAdmin',
            reloadLookupsOnLoad: true,
            fields: [
                {
                    name: 'name',
                    required: true
                },
                {
                    name: 'groupName',
                    label: 'Group',
                    lookupName: 'groupNames',
                    required: true
                },
                {
                    name: 'valueType',
                    label: 'Type',
                    lookupName: 'valueTypes',
                    lookupStrict: true,
                    editable: 'onAdd',
                    required: true
                },
                {
                    name: 'value',
                    typeField: 'valueType',
                    required: true
                },
                {
                    name: 'clientVisible',
                    type: 'bool',
                    defaultValue: false,
                    required: true
                },
                {
                    name: 'note'
                },
                {
                    name: 'lastUpdated',
                    type: 'date',
                    editable: false
                },
                {
                    name: 'lastUpdatedBy',
                    editable: false
                }
            ]
        }),
        actionWarning: {
            del: 'Are you sure you want to delete? Deleting configs can break running apps!'
        },
        unit: 'config',
        filterFields: ['name', 'value', 'groupName', 'note'],

        sortBy: 'name',
        groupBy: 'groupName',
        columns: [
            {field: 'name', width: 200},
            {field: 'valueType', headerName: 'Type', width: 80, align: 'center'},
            {field: 'value', width: 200, renderer: this.maskIfPwd},
            {field: 'clientVisible', ...boolCheckCol, headerName: 'Client?', width: 75},
            {field: 'groupName', headerName: 'Group', width: 100},
            {field: 'note', minWidth: 60, flex: true}
        ],
        editors: [
            {field: 'name'},
            {field: 'groupName'},
            {field: 'valueType'},
            // special handling to keep dynamically generated controls consistent
            {field: 'value', type: 'boolSelect', height: 300},
            {field: 'clientVisible'},
            {field: 'note', type: 'textarea'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    differModel = new ConfigDifferModel(this.gridModel);

    render() {
        return fragment(
            restGrid({
                model: this.gridModel,
                extraToolbarItems: this.extraToolbarItems
            }),
            configDiffer({model: this.differModel})
        );
    }

    async loadAsync() {
        return this.gridModel.loadAsync();
    }

    //-------------------------
    // Implementation
    //-------------------------
    maskIfPwd(value, data) {
        return data.valueType === 'pwd' ? '*****' : value;
    }

    extraToolbarItems = () => {
        return button({
            icon: Icon.diff(),
            text: 'Compare w/ Remote',
            onClick: this.onDifferBtnClick
        });
    }

    onDifferBtnClick = () => {
        this.differModel.open();
    }

    destroy() {
        XH.safeDestroy(this.gridModel, this.differModel);
    }
}
