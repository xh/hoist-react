/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {boolCheckCol} from 'hoist/columns/Core';
import {nameCol, valueTypeCol, confValCol, noteCol} from '../../columns/Columns';
import {Ref, resolve} from 'hoist';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class ConfigPanel extends Component {
    url = 'rest/configAdmin';
    columns = [
        nameCol(),
        valueTypeCol(),
        confValCol({text: 'Prod Value', field: 'prodValue'}),
        confValCol({text: 'Beta Value', field: 'betaValue'}),
        confValCol({text: 'Stage Value', field: 'stageValue'}),
        confValCol({text: 'Dev Value', field: 'devValue'}),
        boolCheckCol({text: 'Client?', field: 'clientVisible', width: 90}),
        noteCol()
    ]
    ref = new Ref();

    render() {
        return restGrid({columns: this.columns, url: this.url, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }

}