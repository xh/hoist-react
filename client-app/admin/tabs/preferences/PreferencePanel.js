/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {Ref, resolve} from 'hoist';
import {h2} from 'hoist/layout';
import {boolCheckCol} from 'hoist/columns/Core';
import {nameFlexCol, typeCol, prefValueCol, notesCol} from '../../columns/Columns';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class PreferencePanel extends Component {

    url = 'rest/preferenceAdmin';

    columns = [
        boolCheckCol({field: 'local', width: 60}),
        nameFlexCol(),
        typeCol(),
        prefValueCol(),
        notesCol()
    ];

    editors = [
        {name: 'name', allowBlank: false},
        {name: 'type', allowBlank: false, additionsOnly: true},
        {name: 'defaultValue'},
        {name: 'local'},
        {name: 'notes', type: 'textarea'},
        {name: 'lastUpdated', readOnly: true},
        {name: 'lastUpdatedBy', readOnly: true}
    ];

    ref = new Ref();

    render() {
        return restGrid({url: this.url, columns: this.columns, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }

}