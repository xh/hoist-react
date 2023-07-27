import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {assignedTab} from './users/Assigned';
import {allTab} from './users/All';

export const usersTabContainer = hoistCmp.factory({
    render() {
        return tabContainer({
            modelConfig: {
                tabs: [
                    {
                        id: 'assigned',
                        title: 'Assigned Users',
                        content: assignedTab
                    },
                    {
                        id: 'all',
                        title: 'All Users',
                        content: allTab
                    }
                ],
                defaultTabId: 'all'
            }
        });
    }
});
