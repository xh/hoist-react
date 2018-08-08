/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {boolCheckCol} from '@xh/hoist/columns';
import {usernameCol} from '@xh/hoist/admin/columns';

@HoistModel()
export class UserModel {

    gridModel = new GridModel({
        stateModel: 'xhUserGrid',
        enableColChooser: true,
        enableExport: true,
        store: new UrlStore({
            url: 'userAdmin',
            fields: ['username', 'email', 'displayName', 'active', 'roles']
        }),
        columns: [
            {field: 'username', ...usernameCol, width: 175},
            {field: 'email', width: 175},
            {field: 'displayName', width: 150},
            {field: 'active', ...boolCheckCol, width: 75},
            {field: 'roles', minWidth: 130, flex: true}
        ]
    });

    async loadAsync() {
        return this.gridModel.loadAsync();
    }
}
