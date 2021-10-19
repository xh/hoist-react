/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable} from '@xh/hoist/mobx';
import * as Col from '@xh/hoist/admin/columns';
import {keyBy, keys} from 'lodash';

export class UserModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminUserState'};

    @bindable activeOnly = true;
    @bindable withRolesOnly = false;

    @managed
    gridModel;

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = new GridModel({
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            store: {idSpec: 'username'},
            sortBy: 'username',
            columns: [
                {...Col.username},
                {...Col.email},
                {...Col.displayName},
                {...Col.active},
                {...Col.roles}
            ]
        });

        this.addReaction({
            track: () => [this.activeOnly, this.withRolesOnly],
            run: () => this.loadAsync()
        });
    }

    @action
    async doLoadAsync(loadSpec) {
        // Knit users and roles back together again here on the admin client.
        // We could make this something the server can produce on its own...
        const userLoad = XH.fetchJson({
            url: 'userAdmin/users',
            params: {activeOnly: this.activeOnly},
            loadSpec
        });
        const rolesLoad = XH.fetchJson({
            url: 'userAdmin/roles',
            loadSpec
        });

        return Promise.allSettled([
            userLoad, rolesLoad
        ]).then(results => {
            let users = results[0].value,
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

            if (this.withRolesOnly) {
                users = users.filter(it => it.roles.length != 0);
            }

            this.gridModel.loadData(users);
        }).catchDefault();
    }
}


