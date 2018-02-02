/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer, observable} from 'hoist/mobx';
import {boolCheckCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameFlexCol, typeCol, prefValueCol, notesCol} from '../../columns/Columns';

@observer
export class PreferencePanel extends Component {

    @observable
    model = new RestGridModel({
        url: 'rest/preferenceAdmin',
        columns: [
            boolCheckCol({field: 'local', width: 60}),
            nameFlexCol(),
            typeCol(),
            prefValueCol({field: 'defaultValue'}),
            notesCol()
        ],
        editors: [
            {name: 'name', allowBlank: false},
            {name: 'type', allowBlank: false, additionsOnly: true},
            {name: 'defaultValue'},
            {name: 'local'},
            {name: 'notes', type: 'textarea'},
            {name: 'lastUpdated', readOnly: true},
            {name: 'lastUpdatedBy', readOnly: true}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}