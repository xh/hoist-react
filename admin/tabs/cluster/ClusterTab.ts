/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {distributedObjectsPanel} from '@xh/hoist/admin/tabs/cluster/distobjects/DistributedObjectsPanel';
import {instancesTab} from '@xh/hoist/admin/tabs/cluster/instances/InstancesTab';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

export const clusterTab = hoistCmp.factory(() =>
    tabContainer({
        modelConfig: {
            route: 'default.cluster',
            switcher: {orientation: 'left', testId: 'cluster-tab-switcher'},
            tabs: [
                {id: 'instances', icon: Icon.info(), content: instancesTab},
                {id: 'objects', icon: Icon.settings(), content: distributedObjectsPanel}
            ]
        }
    })
);
