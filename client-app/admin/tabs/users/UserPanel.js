/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {observer, observable} from 'hoist/mobx';

import {usernameCol} from '../../columns/Columns';

@observer
export class UserPanel extends Component {

    @observable
    model = new GridModel({
        url: 'userAdmin',
        columns: [
            usernameCol({width: 175}),
            baseCol({text: 'Email', field: 'email', width: 175}),
            baseCol({text: 'Display Name', field: 'displayName', width: 150}),
            boolCheckCol({text: 'Active?', field: 'active', width: 75}),
            baseCol({text: 'Roles', field: 'roles', flex: 1})
        ]
    });

    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
