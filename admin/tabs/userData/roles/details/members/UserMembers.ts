/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleModel} from '../../RoleModel';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {BaseMembersModel} from './BaseMembersModel';
import {HoistRole, UserSource} from '../../Types';
import {ColumnRenderer, grid} from '@xh/hoist/cmp/grid';
import {hbox} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {filter, keyBy, partition, sortBy, uniq, uniqBy} from 'lodash';

export const userMembers = hoistCmp.factory({
    className: 'xh-admin-members',
    displayName: 'UsersMembers',
    model: creates(() => UserMembersModel),
    render({className}) {
        return panel({className, item: grid()});
    }
});

class UserMembersModel extends BaseMembersModel {
    override entityName = 'users';
    override get emptyText() {
        return 'This role has no users';
    }

    override getGridData(role: HoistRole): PlainObject[] {
        const members = keyBy(filter(role.members, {type: 'USER'}), 'name');
        return role.effectiveUsers.map(it => ({
            name: it.name,
            sources: this.userSourceList(it.sources),
            dateCreated: members[it.name]?.dateCreated,
            createdBy: members[it.name]?.createdBy
        }));
    }

    private userSourceList(sources: UserSource[]): UserSource[] {
        const [thisRole, otherRoles] = partition(sources, {role: this.selectedRole.name});
        return [...thisRole, ...sortBy(otherRoles, ['role', 'directoryGroup'])];
    }

    override sourcesRenderer: ColumnRenderer = (sources: UserSource[]) => {
        let tagSpecs = sources.map(({role, directoryGroup}) => {
            const isThisRole = role === this.selectedRole.name;
            return {
                className: classNames(
                    'roles-renderer__role',
                    !isThisRole && 'roles-renderer__role--effective'
                ),
                intent: isThisRole ? null : 'primary',
                item: isThisRole ? RoleModel.fmtDirectoryGroup(directoryGroup) ?? '<Direct>' : role,
                title: isThisRole ? directoryGroup ?? '<Direct>' : role,
                minimal: true,
                onClick: () => !isThisRole && this.roleModel.selectRoleAsync(role)
            };
        });

        return hbox({
            className: 'roles-renderer',
            items: uniqBy(tagSpecs, 'item').map(it => tag(it))
        });
    };

    override sourcesExportRenderer: ColumnRenderer = (sources: UserSource[]) => {
        const labels = sources.map(({role, directoryGroup}) => {
            return role === this.selectedRole.name ? directoryGroup ?? '<Direct>' : role;
        });
        return uniq(labels).join(', ');
    };
}
