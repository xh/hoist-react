/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {Ref, resolve} from 'hoist';
import {nameFlexCol, noteCol} from '../../columns/Columns';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class MonitorEditorPanel extends Component {
    url = 'rest/monitorAdmin';
    columns = [
        boolCheckCol({field: 'active', width: 60}),
        baseCol({field: 'code', width: 150}),
        nameFlexCol(),
        baseCol({field: 'warnThreshold', width: 120}),
        baseCol({field: 'failThreshold', width: 120}),
        baseCol({field: 'metricUnit', width: 100}),
        noteCol({field: 'notes'}),
        baseCol({field: 'sortOrder', width: 100})
    ]

    editors = [
        {name: 'code', allowBlank: false},
        {name: 'name', allowBlank: false},
        {name: 'metricType', editable: false}, // must select one of none/ceiling/floor
        {name: 'warnThreshold'},
        {name: 'failThreshold'},
        {name: 'metricUnit'},
        {name: 'params', type: 'textarea'},
        {name: 'notes', type: 'textarea'},
        {name: 'active'},
        {name: 'sortOrder'},
        {name: 'lastUpdated', readOnly: true},
        {name: 'lastUpdatedBy', readOnly: true}
    ];

    ref = new Ref();

    render() {
        return restGrid({columns: this.columns, url: this.url, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }

}
