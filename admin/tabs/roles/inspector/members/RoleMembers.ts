import {RoleMembersModel} from '@xh/hoist/admin/tabs/roles/inspector/members/RoleMembersModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hbox, placeholder} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import './RoleMembers.scss';

export interface RoleMembersProps extends HoistProps<RoleMembersModel> {
    showEffective: boolean;
}

export const roleMembers = hoistCmp.factory<RoleMembersProps>({
    className: 'role-members',
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({className, model}) {
        const {selectedRole} = model;
        if (!selectedRole) return placeholder('Select a role to view its members.');
        return panel({
            className,
            tbar: [
                hbox({
                    className: `${className}__header`,
                    items: [Icon.idBadge(), selectedRole.name]
                }),
                filler(),
                gridCountLabel({unit: 'member'}),
                '-',
                storeFilterField()
            ],
            item: grid()
        });
    }
});
