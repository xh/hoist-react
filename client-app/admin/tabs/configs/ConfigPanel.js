/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {environmentService} from 'hoist';
import {boolCheckCol, baseCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameCol} from '../../columns/Columns';

@observer
export class ConfigPanel extends Component {

    model = new RestGridModel({
        url: 'rest/configAdmin',
        recordSpec: {
            fields: this.filterForEnv([
                {name: 'name', label: 'Name'},
                {name: 'groupName', label: 'Group', lookup: 'groupNames'},
                {name: 'valueType', label: 'Type', lookup: 'valueTypes'},
                {name: 'prodValue', label: 'Prod Value', typeField: 'valueType', env: 'Production'},
                {name: 'betaValue', label: 'Beta Value', allowNull: true, typeField: 'valueType', env: 'Beta'},
                {name: 'stageValue', label: 'Stage Value', allowNull: true, typeField: 'valueType', env: 'Staging'},
                {name: 'devValue', label: 'Dev Value', allowNull: true, typeField: 'valueType', env: 'Development'},
                {name: 'clientVisible', label: 'Client?', type: 'bool'},
                {name: 'note', label: 'Note', allowNull: true},
                {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true, allowNull: true},
                {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true, allowNull: true}
            ])
        },
        columns: this.filterForEnv([
            nameCol(),
            baseCol({field: 'valueType', maxWidth: 60}),
            baseCol({field: 'groupName', width: 80}),
            this.valCol({field: 'prodValue', env: 'Production'}),
            this.valCol({field: 'betaValue', env: 'Beta'}),
            this.valCol({field: 'stageValue', env: 'Staging'}),
            this.valCol({field: 'devValue', env: 'Development'}),
            boolCheckCol({field: 'clientVisible', minWidth: 40, maxWidth: 90}),
            baseCol({field: 'note', flex: 1})
        ]),
        editors: this.filterForEnv([
            {field: 'name'},
            {field: 'groupName', allowAdditions: true},
            {field: 'valueType', additionsOnly: true},
            {field: 'prodValue', env: 'Production'},
            {field: 'betaValue', env: 'Beta'},
            {field: 'stageValue', env: 'Staging'},
            {field: 'devValue', env: 'Development'},
            {field: 'clientVisible', type: 'bool'},
            {field: 'note', type: 'textarea'},
            {field: 'lastUpdated', type: 'displayField'},
            {field: 'lastUpdatedBy', type: 'displayField'}
        ])
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }

    //-------------------------
    // Implementation
    //-------------------------
    filterForEnv(vals) {
        const envs = environmentService.get('supportedEnvironments'),
            ret = vals.filter(it => !it.env || envs.includes(it.env));

        ret.forEach(it => delete it.env);
        return ret;
    }

    valCol(params) {
        return baseCol({...params, width: 175});
    }
}