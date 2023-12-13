import {RoleMembersModel} from '@xh/hoist/admin/tabs/roles/details/members/RoleMembersModel';
import {badge} from '@xh/hoist/cmp/badge';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './RoleMembers.scss';

export interface RoleMembersTabProps extends HoistProps<RoleMembersModel> {
    showEffective: boolean;
}

export const roleMembers = hoistCmp.factory<RoleMembersTabProps>({
    className: 'xh-admin-role-members',
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({className, model}) {
        return panel({
            className,
            tbar: [
                buttonGroupInput({
                    bind: 'activeTabId',
                    items: [
                        button({
                            text: hbox('Direct Members', badge(model.directMemberCount)),
                            value: 'directMembers'
                        }),
                        button({
                            text: hbox('Effective Members', badge(model.effectiveMemberCount)),
                            value: 'effectiveMembers'
                        })
                    ]
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
