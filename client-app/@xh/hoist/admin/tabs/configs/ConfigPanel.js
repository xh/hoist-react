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

hoistComponent()
export class ConfigPanel extends Component {

    store = new RestStore({
        url: 'rest/configAdmin',
        fields: this.filterForEnv([
            {name: 'name', label: 'Name'},
            {name: 'groupName', label: 'Group', lookup: 'groupNames'},
            {name: 'valueType', label: 'Type', lookup: 'valueTypes'},
            {name: 'prodValue', label: 'Prod Value', typeField: 'valueType', env: 'Production'},
            {name: 'betaValue', label: 'Beta Value', allowNull: true, typeField: 'valueType', env: 'Beta'},
            {name: 'stageValue', label: 'Stage Value', allowNull: true, typeField: 'valueType', env: 'Staging'},
            {name: 'devValue', label: 'Dev Value', allowNull: true, typeField: 'valueType', env: 'Development'},
            {name: 'clientVisible', label: 'Client?', type: 'bool', defaultValue: false},
            {name: 'note', label: 'Note', allowNull: true},
            {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true, allowNull: true},
            {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true, allowNull: true}
        ])
    });

    gridModel = new RestGridModel({
        store: this.store,
        actionWarning: {
            edit: 'Are you sure you want to edit? Editing configs can break running apps!',
            del: 'Are you sure you want to delete? Deleting configs can break running apps!'
        },

        columns: this.filterForEnv([
            nameCol(),
            baseCol({field: 'valueType', width: 100}),
            baseCol({field: 'groupName', width: 100}),
            this.valCol({field: 'prodValue', env: 'Production'}),
            this.valCol({field: 'betaValue', env: 'Beta'}),
            this.valCol({field: 'stageValue', env: 'Staging'}),
            this.valCol({field: 'devValue', env: 'Development'}),
            boolCheckCol({field: 'clientVisible', width: 90}),
            baseCol({field: 'note', flex: 1})
        ]),
        editors: this.filterForEnv([
            {field: 'name'},
            {field: 'groupName'},
            {field: 'valueType', additionsOnly: true, editable: false},
            {field: 'prodValue', env: 'Production'},
            {field: 'betaValue', env: 'Beta'},
            {field: 'stageValue', env: 'Staging'},
            {field: 'devValue', env: 'Development'},
            {field: 'clientVisible'},
            {field: 'note', type: 'textarea'},
            {field: 'lastUpdated', type: 'displayField'},
            {field: 'lastUpdatedBy', type: 'displayField'}
        ])
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    loadAsync() {
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
        return baseCol({...params, width: 175});
    }
}
