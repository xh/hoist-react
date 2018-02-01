/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer, observable} from 'hoist/mobx';
import {environmentService} from 'hoist';
import {boolCheckCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameCol, valueTypeCol, confValCol, noteCol} from '../../columns/Columns';

@observer
export class ConfigPanel extends Component {

    @observable
    model = new RestGridModel({
        url: 'rest/configAdmin',
        columns: this.filterForEnv([
            nameCol(),
            valueTypeCol(),
            confValCol({text: 'Prod Value', field: 'prodValue', env: 'Production'}),
            confValCol({text: 'Beta Value', field: 'betaValue', env: 'Beta'}),
            confValCol({text: 'Stage Value', field: 'stageValue', env: 'Staging'}),
            confValCol({text: 'Dev Value', field: 'devValue', env: 'Development'}),
            boolCheckCol({text: 'Client?', field: 'clientVisible', minWidth: 40, maxWidth: 90}),
            noteCol()
        ]),
        editors: this.filterForEnv([
            {name: 'name'},
            {name: 'groupName', label: 'Group', forceSelection: false},
            {name: 'valueType', additionsOnly: true},
            {name: 'prodValue', env: 'Production'},
            {name: 'betaValue', env: 'Beta'},
            {name: 'stageValue', env: 'Staging'},
            {name: 'devValue', env: 'Development'},
            {name: 'clientVisible', type: 'bool'},
            {name: 'note', type: 'textarea'},
            {name: 'lastUpdated', readOnly: true},
            {name: 'lastUpdatedBy', readOnly: true}
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
}