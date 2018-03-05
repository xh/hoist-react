
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
            const dateCreated = moment(rec.dateCreated);
            if (dateCreated.isBefore(this.startDate)) return false;
            if (dateCreated.isAfter(this.endDate)) return false;
            if (!rec.username.includes(this.username)) return false;
            if (!rec.msg.includes(this.msg)) return false;
            return true
        }
    }

}