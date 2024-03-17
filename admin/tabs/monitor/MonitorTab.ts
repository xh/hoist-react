/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, XH} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {Icon} from '@xh/hoist/icon';
import {monitorEditorPanel} from './MonitorEditorPanel';
import {monitorResultsPanel} from './MonitorResultsPanel';

export const monitorTab = hoistCmp.factory(() => {
    const enabled = XH.getConf('xhEnableMonitoring', true);
    return enabled
        ? tabContainer({
              modelConfig: {
                  route: 'default.monitor',
                  switcher: {orientation: 'left', testId: 'monitor-tab-switcher'},
                  tabs: [
                      {id: 'status', icon: Icon.shieldCheck(), content: monitorResultsPanel},
                      {id: 'config', icon: Icon.settings(), content: monitorEditorPanel}
                  ]
              }
          })
        : errorMessage({error: 'Monitoring disabled via xhEnableMonitor config.'});
});
