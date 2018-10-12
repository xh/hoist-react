/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {LocalStore} from '@xh/hoist/data';
import {allSettled} from '@xh/hoist/promise';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {boolCheckCol} from '@xh/hoist/columns';
import {usernameCol} from '@xh/hoist/admin/columns';
import {bindable, action} from '@xh/hoist/mobx/index';
import {keyBy, keys} from 'lodash';

@HoistModel
export class UserModel {

    @bindable activeOnly = true;

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
            track: () => [this.activeOnly],
            run: () => this.loadAsync()
        });
    }

    @action
    async loadAsync() {
        // Knit users and roles back together again here on the admin client.
        // We could make this something the server can produce on its own...
        const userLoad = XH.fetchJson({url: 'userAdmin/users', params: {activeOnly: this.activeOnly}}),
            rolesLoad = XH.fetchJson({url: 'userAdmin/roles'});

        return allSettled([
            userLoad, rolesLoad
        ]).then(results => {
            const users = results[0].value,
                byUsername = keyBy(users, 'username'),
                roleMappings = results[1].value;

            // Initialize empty roles[] on each user.
            users.forEach(user => user.roles = []);

            // Loop through sorted roles, lookup and apply to users.
            keys(roleMappings).sort().forEach(role => {
                const roleUsers = roleMappings[role];
                roleUsers.forEach(roleUser => {
                    const user = byUsername[roleUser];
                    if (user) user.roles.push(role);
                });
            });

            this.gridModel.loadData(users);
        }).catchDefault();
    }
}


