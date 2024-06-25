/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer, grid} from '@xh/hoist/cmp/grid';
import {box, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {filter, keyBy} from 'lodash';
import {RoleModel} from '../../RoleModel';
import {HoistRole} from '../../Types';
import {BaseMembersModel} from './BaseMembersModel';

export const directoryMembers = hoistCmp.factory({
    className: 'xh-admin-members',
    displayName: 'DirectoryMembers',
    model: creates(() => DirectoryMembersModel),
    render({className}) {
        return panel({
            className,
            item: grid(),
            tbar: toolbar(
                span('Members of groups below have this role.'),
                filler(),
                gridFindField()
            )
        });
    }
});

class DirectoryMembersModel extends BaseMembersModel {
    override entityName = 'directories';

    override get emptyText() {
        return 'This role has no directory group members.';
    }

    override getGridData(role: HoistRole): PlainObject[] {
        const members = keyBy(filter(role.members, {type: 'DIRECTORY_GROUP'}), 'name');
        return role.effectiveDirectoryGroups.map(it => ({
            name: it.name,
            sources: this.sourceList(it.sourceRoles),
            error: role.errors.directoryGroups[it.name],
            dateCreated: members[it.name]?.dateCreated,
            createdBy: members[it.name]?.createdBy
        }));
    }

    override nameRenderer: ColumnRenderer = (name, {record}) => {
        const {error} = record.data;
        return hbox({
            alignItems: 'center',
            items: [
                box({
                    item: RoleModel.fmtDirectoryGroup(name),
                    paddingRight: 'var(--xh-pad-half-px)',
                    title: name
                }),
                Icon.warning({omit: !error, intent: 'warning', title: error})
            ]
        });
    };
}
