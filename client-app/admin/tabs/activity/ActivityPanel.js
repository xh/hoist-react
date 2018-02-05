/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {grid, GridModel} from 'hoist/grid';
import {observer} from 'hoist/mobx';
import {numberRenderer} from 'hoist/format';
import {dateTimeCol, baseCol} from 'hoist/columns/Core';

import {usernameCol} from '../../columns/Columns';

@observer
export class ActivityPanel extends Component {

    model = new GridModel({
        url: 'trackLogAdmin',
        columns: [
            baseCol({field: 'severity', width: 60}),
            dateTimeCol({field: 'dateCreated', text: 'Date Created'}),
            usernameCol(),
            baseCol({field: 'msg', text: 'Message', width: 60}),
            baseCol({field: 'category', text: 'Category', width: 100}),
            baseCol({field: 'device', text: 'Device', width: 60}),
            baseCol({field: 'browser', text: 'Browser', width: 100}),
            baseCol({field: 'data', text: 'Data', flex: 1}),
            baseCol({field: 'impersonating', text: 'Impersonating', width: 120}),
            baseCol({
                field: 'elapsed',
                text: 'Elapsed (ms)',
                width: 60,
                valueFormatter: numberRenderer({precision: 0})
            })
        ]
    });

    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
