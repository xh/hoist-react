/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {React, Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {popover2} from 'hoist/blueprint';
import {div} from 'hoist/layout';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {nameFlexCol, noteCol} from '../../columns/Columns';
import {restForm, RestForm} from 'hoist/rest/RestEditor';


@observer
export class MonitorEditorPanel extends Component {

    @observable rows = null;
    @observable _rec = null;

    url = 'rest/monitorAdmin';

    editors = [
        {name: 'code', allowBlank: false},
        {name: 'name', allowBlank: false},
        {name: 'metricType', editable: false}, // must select one of none/ceiling/false
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

    render() {
        const formProps = {
            rec: this._rec,
            title: this._rec ? this._rec.name : 'Record',
            editors: this.editors,
            url: this.url
        };

        return div({
            style: {display: 'flex', width: '100%'},
            items: [
                gridPanel({
                    rows: toJS(this.rows),
                    columns: [
                        boolCheckCol({field: 'active', width: 60}),
                        baseCol({field: 'code', width: 150}),
                        nameFlexCol(),
                        baseCol({field: 'warnThreshold', width: 120}),
                        baseCol({field: 'failThreshold', width: 120}),
                        baseCol({field: 'metricUnit', width: 100}),
                        noteCol({field: 'notes'}),
                        baseCol({field: 'sortOrder', width: 100})
                    ],
                    gridOptions: {
                        onRowDoubleClicked: this.onRowDoubleClicked.bind(this)
                    }
                }),
                restForm(formProps)
            ]

        });
    }

    loadAsync() {
        return XH
            .fetchJson({url: 'rest/monitorAdmin'})
            .then(rows => {
                this.completeLoad(true, rows.data);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }

    @action
    onRowDoubleClicked(arg) {
        const rec = arg.data;
        this._rec = rec;
    }
}
