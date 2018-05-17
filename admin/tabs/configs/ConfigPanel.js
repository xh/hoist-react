/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {XH, HoistComponent} from 'hoist/core';
import {fragment} from 'hoist/cmp/layout';
import {boolCheckCol, baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';
import {Icon} from 'hoist/icon';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';

import {configDiffer} from './differ/ConfigDiffer';
import {ConfigDifferModel} from './differ/ConfigDifferModel';

@HoistComponent()
export class ConfigPanel extends Component {

    differModel = new ConfigDifferModel({});

    gridModel = new RestGridModel({
        store: new RestStore({
            url: 'rest/configAdmin',
            reloadLookupsOnLoad: true,
            fields: this.filterForEnv([
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
                    name: 'prodValue',
                    typeField: 'valueType',
                    required: true,
                    env: 'Production'
                },
                {
                    name: 'betaValue',
                    typeField: 'valueType',
                    env: 'Beta'
                },
                {
                    name: 'stageValue',
                    typeField: 'valueType',
                    env: 'Staging'
                },
                {
                    name: 'devValue',
                    typeField: 'valueType',
                    env: 'Development'
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
            ])
        }),
        actionWarning: {
            del: 'Are you sure you want to delete? Deleting configs can break running apps!'
        },
        unit: 'config',
        filterFields: ['name', 'prodValue', 'betaValue', 'stageValue', 'devValue', 'groupName', 'note'],

        sortBy: 'name',
        groupBy: 'groupName',
        columns: this.filterForEnv([
            nameCol({fixedWidth: 200}),
            baseCol({field: 'valueType', headerName: 'Type', fixedWidth: 80, align: 'center'}),
            this.valCol({field: 'prodValue', env: 'Production'}),
            this.valCol({field: 'betaValue', env: 'Beta'}),
            this.valCol({field: 'stageValue', env: 'Staging'}),
            this.valCol({field: 'devValue', env: 'Development'}),
            boolCheckCol({field: 'clientVisible', headerName: 'Client?', fixedWidth: 75}),
            baseCol({field: 'groupName', headerName: 'Group', fixedWidth: 100}),
            baseCol({field: 'note', minWidth: 60})
        ]),
        editors: this.filterForEnv([
            {field: 'name'},
            {field: 'groupName'},
            {field: 'valueType'},
            {field: 'prodValue', env: 'Production', type: 'boolSelect'}, // special handling to keep dynamically generated controls consistent
            {field: 'betaValue', env: 'Beta', type: 'boolSelect'},
            {field: 'stageValue', env: 'Staging', type: 'boolSelect'},
            {field: 'devValue', env: 'Development', type: 'boolSelect'},
            {field: 'clientVisible'},
            {field: 'note', type: 'textarea'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ])
    });

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
    filterForEnv(vals) {
        const envs = XH.getEnv('supportedEnvironments'),
            ret = vals.filter(it => !it.env || envs.includes(it.env));

        ret.forEach(it => delete it.env);
        return ret;
    }

    valCol(params) {
        return baseCol({...params, fixedWidth: 175, valueFormatter: this.maskIfPwd});
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
