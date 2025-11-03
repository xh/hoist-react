/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {keyBy, keys} from 'lodash';

export class UserModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminUserState'};

    @bindable activeOnly = true;
    @bindable withRolesOnly = false;

    @managed
    gridModel: GridModel;

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = new GridModel({
            emptyText: 'No users found.',
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('users')},
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

    override async doLoadAsync(loadSpec: LoadSpec) {
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

        return Promise.allSettled([userLoad, rolesLoad])
            .then((results: any) => {
                let users = results[0].value,
                    byUsername = keyBy(users, 'username'),
                    roleMappings = results[1].value;

                // Initialize empty roles[] on each user.
                users.forEach(user => (user.roles = []));

                // Loop through sorted roles, lookup and apply to users.
                keys(roleMappings)
                    .sort()
                    .forEach(role => {
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
            })
            .catchDefault();
    }
}
