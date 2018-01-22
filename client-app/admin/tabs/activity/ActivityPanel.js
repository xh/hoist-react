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

@observer
export class ActivityPanel extends Component {

    @observable rows = null;

    render() {
        return gridPanel({
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

    loadAsync() {
        return XH
            .fetchJson({url: 'trackLogAdmin'})
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
