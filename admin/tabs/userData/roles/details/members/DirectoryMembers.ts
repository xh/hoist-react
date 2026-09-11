/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnRenderer, ColumnTooltipFn, grid} from '@xh/hoist/cmp/grid';
import {box, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, PlainObject} from '@xh/hoist/core';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './BaseMembers.scss';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {compact, filter, keyBy} from 'lodash';
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
        const {roleModel} = this,
            members = keyBy(filter(role.members, {type: 'DIRECTORY_GROUP'}), 'name');
        return role.effectiveDirectoryGroups.map(it => ({
            name: it.name,
            displayName: roleModel.getDirectoryGroupDisplayName(it.name),
            sources: this.sourceList(it.sourceRoles),
            error:
                role.errors.directoryGroups[it.name] ??
                roleModel.getDirectoryGroupLookupError(it.name),
            dateCreated: members[it.name]?.dateCreated,
            createdBy: members[it.name]?.createdBy
        }));
    }

    override nameRenderer: ColumnRenderer = (name, {record}) => {
        const {displayName, error} = record.data;
        return hbox({
            alignItems: 'center',
            items: [
                box({
                    item: displayName,
                    paddingRight: 'var(--xh-pad-half-px)'
                }),
                Icon.warning({omit: !error, intent: 'warning'})
            ]
        });
    };

    // Show the raw identifier - an opaque GUID for Entra ID, a DN for LDAP - plus any lookup
    // error. A plain string picks up the standard grid tooltip styling.
    override nameTooltip: ColumnTooltipFn = (name, {record}) =>
        compact([name, record.data.error]).join('\n\n');
}
