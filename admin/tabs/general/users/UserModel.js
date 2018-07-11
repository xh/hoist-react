/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';

import {baseCol, boolCheckCol} from '@xh/hoist/columns/Core';
import {usernameCol} from '@xh/hoist/admin/columns/Columns';

@HoistModel()
export class UserModel {

    gridModel = new GridModel({
        stateModel: 'xhUserGrid',
        enableColChooser: true,
        store: new UrlStore({
            url: 'userAdmin',
            fields: ['username', 'email', 'displayName', 'active', 'roles']
        }),
        columns: [
            usernameCol({fixedWidth: 175}),
            baseCol({field: 'email', fixedWidth: 175}),
            baseCol({field: 'displayName', fixedWidth: 150}),
            boolCheckCol({field: 'active', fixedWidth: 75}),
            baseCol({field: 'roles', minWidth: 130, flex: 1})
        ]
    });

    async loadAsync() {
        return this.gridModel.loadAsync();
    }
}
