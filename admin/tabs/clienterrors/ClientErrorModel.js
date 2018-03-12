
/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {action, observable, setter} from 'hoist/mobx';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';
import {fmtDate, numberRenderer} from 'hoist/format';

import {baseCol} from 'hoist/columns/Core';
import {compactDateCol} from 'hoist/columns/DatesTimes';
import {usernameCol} from '../../columns/Columns';

export class ClientErrorModel {

    @observable startDate = moment().subtract(7, 'days').toDate();
    @observable endDate = moment().toDate();

    store = new LocalStore({
        fields: [
            'username', 'error', 'msg', 'browser', 'device',
            'appVersion', 'appEnvironment', 'dateCreated'
        ]
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            compactDateCol({field: 'dateCreated', fixedWidth: 100, align: 'right'}),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'error', minWidth: 450, flex: 3}),
            baseCol({field: 'msg', headerName: 'Message', minWidth: 150, flex: 1}),
            baseCol({field: 'browser', fixedWidth: 100}),
            baseCol({field: 'device', fixedWidth: 80}),
            baseCol({field: 'appVersion', fixedWidth: 130}),
            baseCol({field: 'appEnvironment', fixedWidth: 140})
        ]
    });

    async loadAsync() {
        return XH.fetchJson({
            url: 'clientErrorAdmin'
        }).then(data => {
            this.store.loadDataAsync(data);
        }).catchDefault();
    }

    exportGrid() {
        // const fileName = `Client Errors: ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`;
        const fileName = 'Client Errors';
        this.gridModel.exportDataAsExcel({fileName});
    }

}