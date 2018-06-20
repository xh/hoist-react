/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from '@xh/hoist/kit/blueprint';
import {XH, HoistComponent} from '@xh/hoist/core';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/cmp/rest';
import {fragment} from '@xh/hoist/cmp/layout';
import {boolCheckCol, baseCol} from '@xh/hoist/columns/Core';
import {nameCol} from '@xh/hoist/admin/columns/Columns';
import {Icon} from '@xh/hoist/icon';

import {configDiffer} from './differ/ConfigDiffer';
import {ConfigDifferModel} from './differ/ConfigDifferModel';

@HoistComponent()
export class ConfigPanel extends Component {

    gridModel = new RestGridModel({
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
            nameCol({fixedWidth: 200}),
            baseCol({field: 'valueType', headerName: 'Type', fixedWidth: 80, align: 'center'}),
            this.valCol({field: 'value'}),
            boolCheckCol({field: 'clientVisible', headerName: 'Client?', fixedWidth: 75}),
            baseCol({field: 'groupName', headerName: 'Group', fixedWidth: 100}),
            baseCol({field: 'note', minWidth: 60, flex: 2})
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
    valCol(params) {
        return baseCol({...params, minWidth: 60, flex: 1, valueFormatter: this.maskIfPwd});
    }

    maskIfPwd(params) {
        if (!params) return;
        const data = params.data;
        if (!data) return params;
        if (data.valueType === 'pwd') return '*****';
        return params.value;
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
