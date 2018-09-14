/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {LocalStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {boolCheckCol} from '@xh/hoist/columns';
import {usernameCol} from '@xh/hoist/admin/columns';
import {bindable, action} from '@xh/hoist/mobx/index';

@HoistModel
export class UserModel {

    @bindable includeInactive = true;

    gridModel = new GridModel({
        stateModel: 'xhUserGrid',
        enableColChooser: true,
        enableExport: true,
        store: new LocalStore({
            fields: ['username', 'email', 'displayName', 'active', 'roles']
        }),
        sortBy: 'username',
        columns: [
            {field: 'username', ...usernameCol},
            {field: 'email', width: 175},
            {field: 'displayName', width: 150},
            {field: 'active', ...boolCheckCol, width: 75},
            {field: 'roles', minWidth: 130, flex: true}
        ]
    });

    constructor() {
        this.addReaction({
            track: () => [this.includeInactive],
            run: () => this.loadAsync()
        });
    }

    @action
    async loadAsync() {
        return XH.fetchJson({
            url: 'userAdmin',
            params: {activeOnly: !this.includeInactive}
        }).then(data => {
            this.gridModel.loadData(data);
        }).catchDefault();
    }
}


