/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {filter, keyBy} from 'lodash';
import {ReactNode} from 'react';
import {HoistRole} from '../../Types';
import {BaseMembersModel} from './BaseMembersModel';

export const roleMembers = hoistCmp.factory({
    className: 'xh-admin-members',
    displayName: 'RoleMembers',
    model: creates(() => RoleMembersModel),
    render({model, className}) {
        return panel({
            className,
            item: grid(),
            tbar: toolbar(
                span(
                    model.type == 'inherited'
                        ? 'Users with this role also have the roles below.'
                        : 'Users with any of the roles below also have this role.'
                ),
                filler(),
                gridFindField()
            )
        });
    }
});

class RoleMembersModel extends BaseMembersModel {
    get type(): 'inherited' | 'effective' {
        return this.componentProps.type;
    }

    override entityName = 'roles';

    override get emptyText(): ReactNode {
        const roleName = this.selectedRole?.name;
        return this.type == 'inherited'
            ? `${roleName} does not inherit from any other roles.`
            : `${roleName} has not been granted to any other roles.`;
    }

    override getGridData(role: HoistRole): PlainObject[] {
        const roles = this.type == 'inherited' ? role.inheritedRoles : role.effectiveRoles,
            members = keyBy(filter(role.members, {type: 'ROLE'}), 'name');
        return roles.map(it => ({
            name: it.name,
            sources: this.sourceList(it.sourceRoles),
            dateCreated: members[it.name]?.dateCreated,
            createdBy: members[it.name]?.createdBy
        }));
    }

    override onRowDoubleClicked = ({data: record}) => {
        if (record) this.roleModel.selectRoleAsync(record.data.name);
    };
}
