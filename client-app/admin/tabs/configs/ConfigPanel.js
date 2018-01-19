/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH} from 'hoist';
import {boolCheckCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {adminTab} from '../AdminTab';
import {nameCol, valueTypeCol, confValCol, noteCol} from '../../columns/Columns';


@adminTab('Configs')
@observer
export class ConfigPanel extends Component {

    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return gridPanel({
            title: 'Configs',
            rows: toJS(this.rows),
            columns: [
                nameCol(),
                valueTypeCol(),
                confValCol({text: 'Prod Value', field: 'prodValue'}),
                confValCol({text: 'Beta Value', field: 'betaValue'}),
                confValCol({text: 'Stage Value', field: 'stageValue'}),
                confValCol({text: 'Dev Value', field: 'devValue'}),
                boolCheckCol({text: 'Client?', field: 'clientVisible', width: 90}),
                noteCol()
            ]
        });
    }

    @action
    loadAsync() {
        this.isLoading = true;
        return XH
            .fetchJson({url: 'rest/configAdmin'})
            .then(rows => {
                this.completeLoad(true, rows.data);
            }).catch(e => {
                this.completeLoad(false, e);
                throw e;
            }).catchDefault();
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
        this.lastLoaded = Date.now();
        this.isLoading = false;
    }
}
