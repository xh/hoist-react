/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH} from 'hoist';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {dateCol} from 'hoist/columns/DatesTimes';
import {appCodeCol, usernameCol, definitionCol} from '../../columns/Columns';

@observer
export class DashboardPanel extends Component {

    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return gridPanel({
            rows: toJS(this.rows),
            columns: [
                appCodeCol(),
                usernameCol(),
                dateCol({field: 'lastUpdated'}),
                definitionCol()
            ]
        });
    }

    @action
    loadAsync() {
        this.isLoading = true;
        return XH
            .fetchJson({url: 'rest/dashboardAdmin'})
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
