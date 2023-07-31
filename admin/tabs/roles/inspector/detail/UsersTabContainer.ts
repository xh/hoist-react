import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {assignedTab} from './users/Assigned';
import {allTab} from './users/All';
import {Icon} from '@xh/hoist/icon';

export const usersTabContainer = hoistCmp.factory({
    render() {
        return tabContainer({
            modelConfig: {
                tabs: [
                    {
                        id: 'assigned',
                        title: 'Assigned Users',
                        icon: Icon.user(),
                        content: assignedTab
                    },
                    {
                        id: 'all',
                        title: 'Computed Users',
                        icon: Icon.users(),
                        content: allTab
                    }
                ]
            }
        });
    }
});
