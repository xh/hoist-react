
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

    @observable @setter startDate = moment().toDate();
    @observable @setter endDate = moment().toDate();
    @observable @setter username = '';
    @observable @setter msg = '';
    @observable @setter category = '';
    @observable @setter device = '';
    @observable @setter browser = '';

    constructor({gridModel}) {
        this.gridModel = gridModel; // might not need this after all. The records are observable and when the store gets the filter we get a render for free
    }

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