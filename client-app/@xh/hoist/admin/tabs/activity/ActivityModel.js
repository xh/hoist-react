
/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {forOwn} from 'lodash';
import {observable, setter, toJS} from 'hoist/mobx';
import {fmtDate} from 'hoist/format';

export class ActivityModel {

    @observable @setter startDate = moment().toDate(); // need to figure out where to used this vs new Date(). Why is there a disconnect between this and the visitsModel?
    @observable @setter endDate = moment().toDate();
    @observable @setter username = '';
    @observable @setter msg = '';
    @observable @setter category = '';
    @observable @setter device = '';
    @observable @setter browser = '';

    store = new UrlStore({
        url: 'trackLogAdmin',
        fields: [
            'severity', 'dateCreated', 'username', 'msg', 'category',
            'device', 'browser', 'data', 'impersonating', 'elapsed'
        ]
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            baseCol({field: 'severity', width: 60}),
            dateTimeCol({field: 'dateCreated'}),
            usernameCol(),
            baseCol({field: 'msg', text: 'Message', width: 60}),
            baseCol({field: 'category', width: 100}),
            baseCol({field: 'device', width: 60}),
            baseCol({field: 'browser', width: 100}),
            baseCol({field: 'data', flex: 1}),
            baseCol({field: 'impersonating',  width: 120}),
            baseCol({
                field: 'elapsed',
                width: 60,
                valueFormatter: numberRenderer({precision: 0})
            })
        ]
    });


    setFilter() {
        const store = this.gridModel.store;
        store.filter = this.createFilterFunction();
    }

    //----------------
    // Implementation
    //----------------
    createFilterFunction() {
        return (rec) => {
            const {dateCreated, username, msg, category, device, browser} = rec,
                date = moment(dateCreated);
            if (date.isBefore(this.startDate)) return false;
            if (date.isAfter(this.endDate)) return false;
            if (!username.toLowerCase().includes(this.username)) return false;
            if (!msg.toLowerCase().includes(this.msg)) return false;
            if (!category.toLowerCase().includes(this.category)) return false;
            if (!device.toLowerCase().includes(this.device)) return false;
            if (!browser.toLowerCase().includes(this.browser)) return false;
            return true
        }
    }

}