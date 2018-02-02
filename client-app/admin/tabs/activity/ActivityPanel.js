/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {grid, GridModel} from 'hoist/grid';
import {observer, observable} from 'hoist/mobx';

import {dateTimeCol} from 'hoist/columns/DatesTimes';
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

    @observable model = new GridModel({
        url: 'trackLogAdmin',
        columns: [
            severity(),
            dateTimeCol({field: 'dateCreated'}),
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

    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
