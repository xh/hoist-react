/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BaseMembersModel} from './BaseMembersModel';
import {HoistRole} from '../../Types';
import {grid} from '@xh/hoist/cmp/grid';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {filter, keyBy} from 'lodash';

export const roleMembers = hoistCmp.factory({
    className: 'xh-admin-members',
    displayName: 'RoleMembers',
    model: creates(() => RoleMembersModel),
    render({className}) {
        return panel({className, item: grid()});
    }
});

class RoleMembersModel extends BaseMembersModel {
    get type(): 'inherited' | 'inheriting' {
        return this.componentProps.type;
    }

    override entityName = 'roles';

    override get emptyText() {
        return this.type == 'inherited'
            ? 'No roles inherited by this role.'
            : 'This role not granted to any roles.';
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
