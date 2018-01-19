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
import {dateCol} from 'hoist/columns/DatesTimes';
import {
    usernameCol,
    msg,
    category,
    device,
    browser,
    data,
    impersonating,
    elapsed,
    severity
} from '../../columns/Columns';

@adminTab('Activity')
@observer
export class ActivityPanel extends Component {

    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return gridPanel({
            title: 'Configs',
            rows: toJS(this.rows),
            columns: [
                severity(),
                dateCol({field: 'dateCreated'}),
                usernameCol(),
                msg(),
                category(),
                device(),
                browser(),
                data(),
                impersonating(),
                elapsed()
            ]
        });
    }

    @action
    loadAsync() {
        this.isLoading = true;
        return XH
            .fetchJson({url: 'trackLogAdmin'})
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
