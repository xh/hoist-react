/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleMembersModel} from '@xh/hoist/admin/tabs/general/roles/details/members/RoleMembersModel';
import {RoleMemberType} from '@xh/hoist/admin/tabs/general/roles/Types';
import {badge} from '@xh/hoist/cmp/badge';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, hbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './RoleMembers.scss';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {isEmpty, sum, values} from 'lodash';
import {ReactNode} from 'react';

export interface RoleMembersProps extends HoistProps<RoleMembersModel> {
    showInherited: boolean;
}

export const roleMembers = hoistCmp.factory<RoleMembersProps>({
    className: 'xh-admin-role-members',
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({className, model}) {
        const {inheritedRolesCount, effectiveCounts} = model;
        return panel({
            className,
            tbar: [
                buttonGroupInput({
                    bind: 'activeTabId',
                    outlined: true,
                    items: [
                        button({
                            text: buttonText({
                                text: 'Effective Members',
                                countsByType: effectiveCounts
                            }),
                            value: 'effectiveMembers'
                        }),
                        button({
                            text: buttonText({
                                text: 'Inherited Roles',
                                countsByType: inheritedRolesCount
                            }),
                            value: 'inheritedRoles'
                        })
                    ]
                }),
                filler(),
                storeFilterField()
            ],
            item: grid()
        });
    }
});

interface ButtonTextProps extends HoistProps {
    countsByType: Record<RoleMemberType, number>;
    text: string;
}

const buttonText = hoistCmp.factory<ButtonTextProps>(({countsByType, text}) => {
    const countLabels = [],
        {USER: users, DIRECTORY_GROUP: groups, ROLE: roles} = countsByType;

    if (users) countLabels.push(pluralize('User', users, true));
    if (groups) countLabels.push(pluralize('Directory Group', groups, true));
    if (roles) countLabels.push(pluralize('Role', roles, true));

    return tooltip({
        content: `${text}` + (isEmpty(countLabels) ? '' : ` (${countLabels.join(', ')})`),
        item: hbox({
            alignItems: 'center',
            items: [text, counts({countsByType})]
        })
    });
});

interface CountsProps extends HoistProps {
    countsByType: Record<RoleMemberType, number>;
}

const counts = hoistCmp.factory<CountsProps>(({countsByType}) =>
    badge({
        className: 'xh-admin-role-members__counts',
        item: [
            count({icon: Icon.user(), count: countsByType['USER']}),
            count({icon: Icon.users(), count: countsByType['DIRECTORY_GROUP']}),
            count({icon: Icon.idBadge(), count: countsByType['ROLE']})
        ],
        omit: !sum(values(countsByType))
    })
);

interface CountProps extends HoistProps {
    count: number;
    icon: ReactNode;
}

const count = hoistCmp.factory<CountProps>(({count, icon}) =>
    hbox({
        className: 'xh-admin-role-members__counts__count',
        items: [icon, count],
        omit: !count
    })
);
