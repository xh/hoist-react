/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, hoistComponent} from 'hoist/core';
import {boolCheckCol, baseCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';

import {nameCol} from 'hoist/admin/columns/Columns';

@hoistComponent()
export class ConfigPanel extends Component {

    store = new RestStore({
        url: 'rest/configAdmin',
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
    });

    gridModel = new RestGridModel({
        store: this.store,
        actionWarning: {
            edit: 'Are you sure you want to edit? Editing configs can break running apps!',
            del: 'Are you sure you want to delete? Deleting configs can break running apps!'
        },

        columns: this.filterForEnv([
            nameCol({fixedWidth: 200}),
            baseCol({field: 'valueType', headerName: 'Type', fixedWidth: 60}),
            this.valCol({field: 'prodValue', env: 'Production'}),
            this.valCol({field: 'betaValue', env: 'Beta'}),
            this.valCol({field: 'stageValue', env: 'Staging'}),
            this.valCol({field: 'devValue', env: 'Development'}),
            boolCheckCol({field: 'clientVisible', headerName: 'Client?', fixedWidth: 75, centerAlign: true}),
            baseCol({field: 'groupName', headerName: 'Group', fixedWidth: 100}),
            baseCol({field: 'note', minWidth: 60})
        ]),
        editors: this.filterForEnv([
            {field: 'name'},
            {field: 'groupName'},
            {field: 'valueType'},
            {field: 'prodValue', env: 'Production'},
            {field: 'betaValue', env: 'Beta'},
            {field: 'stageValue', env: 'Staging'},
            {field: 'devValue', env: 'Development'},
            {field: 'clientVisible'},
            {field: 'note', type: 'textarea'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ])
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
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
        if (params.data.valueType === 'pwd') return '*****';
        return params.value;
    }
}
