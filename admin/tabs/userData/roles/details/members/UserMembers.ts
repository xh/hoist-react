/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer, grid} from '@xh/hoist/cmp/grid';
import {filler, hbox, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {filter, keyBy, partition, sortBy, uniq, uniqBy} from 'lodash';
import {HoistRole, UserSource} from '../../Types';
import {BaseMembersModel} from './BaseMembersModel';

export const userMembers = hoistCmp.factory({
    className: 'xh-admin-members',
    displayName: 'UsersMembers',
    model: creates(() => UserMembersModel),
    render({className}) {
        return panel({
            className,
            item: grid(),
            tbar: toolbar(span('Users below have this role.'), filler(), gridFindField())
        });
    }
});

class UserMembersModel extends BaseMembersModel {
    override entityName = 'users';
    override get emptyText() {
        return 'This role has no users.';
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

    private userSourceList(sources: UserSource[]): PlainObject[] {
        const [thisRole, otherRoles] = partition(sources, {role: this.selectedRole.name}),
            ret = [...thisRole, ...sortBy(otherRoles, ['role', 'directoryGroup'])];
        return ret.map(it => ({
            ...it,
            directoryGroupDisplayName: it.directoryGroup
                ? this.roleModel.getDirectoryGroupDisplayName(it.directoryGroup)
                : null
        }));
    }

    override sourcesRenderer: ColumnRenderer = (sources: PlainObject[]) => {
        let tagSpecs = sources.map(({role, directoryGroup, directoryGroupDisplayName}) => {
            const isThisRole = role === this.selectedRole.name;
            return {
                className: classNames(
                    'roles-renderer__role',
                    !isThisRole && 'roles-renderer__role--effective'
                ),
                item: isThisRole ? (directoryGroupDisplayName ?? '<Direct>') : role,
                title: isThisRole ? (directoryGroup ?? '<Direct>') : role,
                minimal: true,
                onDoubleClick: () => !isThisRole && this.roleModel.selectRoleAsync(role)
            };
        });

        return hbox({
            className: 'roles-renderer',
            items: uniqBy(tagSpecs, 'item').map(it => tag(it))
        });
    };

    override sourcesExportRenderer: ColumnRenderer = (sources: PlainObject[]) => {
        const labels = sources.map(({role, directoryGroupDisplayName}) => {
            return role === this.selectedRole.name
                ? (directoryGroupDisplayName ?? '<Direct>')
                : role;
        });
        return uniq(labels).join(', ');
    };
}
