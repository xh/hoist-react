/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './RoleMembers.scss';
import {UserMembersModel} from './UserMembersModel';

export const userMembers = hoistCmp({
    className: 'xh-admin-role-members',
    displayName: 'UsersMembers',
    model: creates(UserMembersModel),
    render({className}) {
        return panel({className, item: grid()});
    }
});
