/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH} from 'hoist';
import {baseCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

@observer
export class ServicePanel extends Component {

    @observable rows = null;
    
    render() {
        return gridPanel({
            rows: toJS(this.rows),
            columns: [
                baseCol({headerName: 'Provider', field: 'provider', width: 150, maxWidth: 150}),
                baseCol({headerName: 'Name', field: 'name', width: 300, maxWidth: 300})
            ]
        });
    }

    loadAsync() {
        return XH
            .fetchJson({url: 'serviceAdmin/listServices'})
            .then(rows => {
                this.preprocessRows(rows);
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad(success, vals) {
        this.rows = success ? vals : [];
    }
    
    preprocessRows(rows) {
        rows.forEach(r => {
            r.provider = r.name && r.name.indexOf('hoist') === 0 ? 'Hoist' : 'App';
        });
    }
}