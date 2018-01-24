/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {Ref, resolve} from 'hoist';
import {nameFlexCol, typeCol, prefValueCol, usernameCol} from '../../columns/Columns';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class UserPreferencePanel extends Component {
    url = 'rest/userPreferenceAdmin'

    columns = [
        nameFlexCol(),
        typeCol(),
        usernameCol(),
        prefValueCol({field: 'userValue'})
    ]

    editors = [
        {name: 'name', allowBlank: false, additionsOnly: true}, // means read only?
        {name: 'username', allowBlank: false},
        {name: 'userValue', allowBlank: false},
        {name: 'lastUpdated', xtype: 'displayfield'},
        {name: 'lastUpdatedBy', xtype: 'displayfield'}
    ]

    ref = new Ref();

    render() {
        return restGrid({url: this.url, columns: this.columns, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }
}