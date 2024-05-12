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
import {DirectoryMembersModel} from './DirectoryMembersModel';

export const directoryMembers = hoistCmp({
    className: 'xh-admin-role-members',
    displayName: 'DirectoryMembers',
    model: creates(DirectoryMembersModel),
    render({className}) {
        return panel({className, item: grid()});
    }
});
