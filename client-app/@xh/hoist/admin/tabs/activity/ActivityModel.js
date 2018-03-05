
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

    constructor({gridModel}) {
        this.gridModel = gridModel;
    }

    get activityFilter(){
        return this.createFilterFunction()
    }


    //----------------
    // Implementation
    //----------------

    createFilterFunction() {
        return (rec) => {
            const dateCreated = moment(rec.dateCreated);
            if (dateCreated.isBefore(this.startDate)) return false;
            if (dateCreated.isAfter(this.endDate)) return false;
            return true
        }
    }

}