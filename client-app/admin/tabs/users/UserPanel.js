/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH} from 'hoist';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {usernameCol} from '../../columns/Columns';

@observer
export class UserPanel extends Component {
    
    @observable rows = null;

    render() {
        return gridPanel({
            rows: toJS(this.rows),
            columns: [
                usernameCol({width: 175}),
                baseCol({text: 'Email', field: 'email', width: 175}),
                baseCol({text: 'Display Name', field: 'displayName', width: 150}),
                boolCheckCol({text: 'Active?', field: 'active', width: 75}),
                baseCol({text: 'Roles', field: 'roles', flex: 1})
            ]
        });
    }

    loadAsync() {
        return XH
            .fetchJson({url: 'userAdmin'})
            .then(rows => {
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }
}
