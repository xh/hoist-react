import {RolesTabModel} from './RolesTabModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {allRolesPanel} from './AllRolesPanel';
import {roleDetailPanel} from './RoleDetailPanel';

export const rolesTab = hoistCmp.factory({
    model: creates(RolesTabModel),

    render() {
        return panel({
            mask: 'onLoad',
            items: [allRolesPanel(), roleDetailPanel()]
        });
    }
});
