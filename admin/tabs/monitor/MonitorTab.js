/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';

import {monitorResultsPanel} from './MonitorResultsPanel';
import {monitorEditorPanel} from './MonitorEditorPanel';

export const monitorTab = hoistCmp(
    () => tabContainer({
        model: {
            route: 'default.monitor',
            switcherPosition: 'left',
            tabs: [
                {id: 'status', icon: Icon.shieldCheck(), content: monitorResultsPanel},
                {id: 'config', icon: Icon.settings(), content: monitorEditorPanel}
            ]
        }
    })
);
