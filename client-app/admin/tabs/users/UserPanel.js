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
import {observer} from 'mobx-react';
import {observable, action, toJS} from 'mobx';

import {adminTab} from '../AdminTab';
import {usernameCol} from '../../columns/Columns';


@adminTab('Users')
@observer
export class UserPanel extends Component {
    
    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return gridPanel({
            title: 'Users',
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

    @action
    loadAsync() {
        this.isLoading = true;
        return XH
            .fetchJson({url: 'userAdmin'})
            .then(rows => {
                this.completeLoad(true, rows);
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
