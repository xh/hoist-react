import {RolesTabModel} from './RolesTabModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {allRolesPanel} from './AllRolesPanel';
import {roleDetailPanel} from './details/RoleDetailPanel';
import {hframe} from '@xh/hoist/cmp/layout';

export const rolesTab = hoistCmp.factory({
    model: creates(RolesTabModel),

    render() {
        return hframe({
            items: [
                allRolesPanel(),
                panel({
                    title: 'Role Details',
                    item: roleDetailPanel(),
                    compactHeader: true,
                    modelConfig: {
                        side: 'right',
                        defaultSize: '50%'
                    }
                })
            ]
        });
    }
});
