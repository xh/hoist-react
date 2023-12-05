import {RoleMembersTabModel} from '@xh/hoist/admin/tabs/roles/members/tab/RoleMembersTabModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';

export interface RoleMembersTabProps extends HoistProps<RoleMembersTabModel> {
    showEffective: boolean;
}

export const roleMembersTab = hoistCmp.factory<RoleMembersTabProps>({
    className: 'role-members-tab',
    displayName: 'RoleMembersTab',
    model: creates(RoleMembersTabModel),
    render({className}) {
        return panel({
            className,
            tbar: [filler(), gridCountLabel({unit: 'member'}), '-', storeFilterField()],
            item: grid()
        });
    }
});
