import {RoleMembersModel} from '@xh/hoist/admin/tabs/roles/details/members/RoleMembersModel';
import {RoleMemberType} from '@xh/hoist/admin/tabs/roles/HoistRole';
import {warningBanner} from '@xh/hoist/admin/tabs/roles/warning/WarningBanner';
import {badge} from '@xh/hoist/cmp/badge';
import {grid} from '@xh/hoist/cmp/grid';
import {filler, hbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, HoistProps, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import './RoleMembers.scss';
import {Icon} from '@xh/hoist/icon';
import {ReactNode} from 'react';

export interface RoleMembersTabProps extends HoistProps<RoleMembersModel> {
    showEffective: boolean;
}

export const roleMembers = hoistCmp.factory<RoleMembersTabProps>({
    className: 'xh-admin-role-members',
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({className, model}) {
        const {directCounts, effectiveCounts} = model;
        return panel({
            className,
            tbar: [
                buttonGroupInput({
                    bind: 'activeTabId',
                    items: [
                        button({
                            text: hbox({
                                alignItems: 'center',
                                items: ['Direct Members', counts({countsByType: directCounts})]
                            }),
                            value: 'directMembers'
                        }),
                        button({
                            text: hbox({
                                alignItems: 'center',
                                items: [
                                    'Effective Members',
                                    counts({countsByType: effectiveCounts})
                                ]
                            }),
                            value: 'effectiveMembers'
                        })
                    ]
                }),
                filler(),
                '-',
                storeFilterField()
            ],
            item: grid(),
            bbar: warningBanner({
                message: 'Directory Groups are disabled and will not resolve to users.',
                omit:
                    XH.getConf('xhRoleServiceConfig').enableDirectoryGroups ||
                    (!directCounts.DIRECTORY_GROUP && !effectiveCounts.DIRECTORY_GROUP)
            })
        });
    }
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
        ]
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
