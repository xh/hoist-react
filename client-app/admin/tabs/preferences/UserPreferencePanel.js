/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer, observable} from 'hoist/mobx';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameFlexCol, typeCol, prefValueCol, usernameCol} from '../../columns/Columns';

@observer
export class UserPreferencePanel extends Component {

    @observable
    model = new RestGridModel({
        url: 'rest/userPreferenceAdmin',
        columns: [
            nameFlexCol(),
            typeCol(),
            usernameCol(),
            prefValueCol({field: 'userValue'})
        ],
        editors: [
            {name: 'name', allowBlank: false, additionsOnly: true}, // means read only?
            {name: 'username', allowBlank: false},
            {name: 'userValue', allowBlank: false},
            {name: 'lastUpdated'},
            {name: 'lastUpdatedBy'}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}