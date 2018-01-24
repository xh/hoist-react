/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {dateCol} from 'hoist/columns/DatesTimes';
import {Ref, resolve} from 'hoist';
import {appCodeCol, usernameCol, definitionCol} from '../../columns/Columns';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class DashboardPanel extends Component {

    url = 'rest/dashboardAdmin';

    columns = [
        appCodeCol(),
        usernameCol(),
        dateCol({field: 'lastUpdated'}),
        definitionCol()
    ];

    editors = [
        {name: 'appCode', allowBlank: false},
        {name: 'username', allowBlank: true},
        {name: 'definition', allowBlank: false, flex: 1},
        {name: 'lastUpdated', readOnly: true}
    ];

    ref = new Ref();

    render() {
        return restGrid({url: this.url, columns: this.columns, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }
}
