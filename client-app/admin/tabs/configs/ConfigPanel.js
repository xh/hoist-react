/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {environmentService} from 'hoist';
import {boolCheckCol} from 'hoist/columns/Core';
import {nameCol, valueTypeCol, confValCol, noteCol} from '../../columns/Columns';
import {Ref, resolve} from 'hoist';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class ConfigPanel extends Component {

    url = 'rest/configAdmin';
    columns = this.buildColumns();
    editors = this.buildEditors();

    ref = new Ref();

    render() {
        return restGrid({url: this.url, columns: this.columns, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }

    buildColumns() {
        return this.filterForEnv([
            nameCol(),
            valueTypeCol(),
            confValCol({text: 'Prod Value', field: 'prodValue', env: 'Production'}),
            confValCol({text: 'Beta Value', field: 'betaValue', env: 'Beta'}),
            confValCol({text: 'Stage Value', field: 'stageValue', env: 'Staging'}),
            confValCol({text: 'Dev Value', field: 'devValue', env: 'Development'}),
            boolCheckCol({text: 'Client?', field: 'clientVisible', width: 90}),
            noteCol()
        ]);
    }

    buildEditors() {
        return this.filterForEnv([
            {name: 'name'},
            {name: 'groupName', label: 'Group', forceSelection: false},
            {name: 'valueType', additionsOnly: true},
            {name: 'prodValue', env: 'Production'},
            {name: 'betaValue', env: 'Beta'},
            {name: 'stageValue', env: 'Staging'},
            {name: 'devValue', env: 'Development'},
            {name: 'clientVisible'},
            {name: 'note', xtype: 'textarea'},
            {name: 'lastUpdated', xtype: 'displayfield'},
            {name: 'lastUpdatedBy', xtype: 'displayfield'}
        ]);
    }

    filterForEnv(vals) {
        const envs = environmentService.get('supportedEnvironments'),
            ret = vals.filter(it => !it.env || envs.includes(it.env));

        ret.forEach(it => delete it.env);

        return ret;
    }

}