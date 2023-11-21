import {RoleMembersModel} from '@xh/hoist/admin/tabs/roles/inspector/members/RoleMembersModel';
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import './RoleMembers.scss';

export const roleMembers = hoistCmp.factory({
    className: 'role-members',
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({className, model}) {
        const {showInherited} = model;
        return panel({
            className,
            tbar: [
                button({
                    active: showInherited,
                    icon: showInherited ? Icon.eye() : Icon.eyeSlash(),
                    intent: 'primary',
                    onClick: () => (model.showInherited = !showInherited),
                    outlined: true,
                    text: 'Show Inherited'
                }),
                filler(),
                storeFilterField()
            ],
            item: grid()
        });
    }
});
