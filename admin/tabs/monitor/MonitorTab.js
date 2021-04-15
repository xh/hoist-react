/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {memoryMonitorPanel} from '@xh/hoist/admin/tabs/monitor/MemoryMonitorPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {monitorEditorPanel} from './MonitorEditorPanel';
import {monitorResultsPanel} from './MonitorResultsPanel';

export const monitorTab = hoistCmp.factory(
    () => {
        const omitStatusMonitoring = !XH.getConf('xhEnableMonitoring', true);
        return tabContainer({
            model: {
                route: 'default.monitor',
                switcher: {orientation: 'left'},
                tabs: [
                    {id: 'status', icon: Icon.shieldCheck(), content: monitorResultsPanel, omit: omitStatusMonitoring},
                    {id: 'config', icon: Icon.settings(), content: monitorEditorPanel, omit: omitStatusMonitoring},
                    {id: 'memory', icon: Icon.server(), content: memoryMonitorPanel}
                ]
            }
        });
    }
);
