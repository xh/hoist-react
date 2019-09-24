/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';

import {MonitorResultsPanel} from './MonitorResultsPanel';
import {MonitorEditorPanel} from './MonitorEditorPanel';

export const MonitorTab = hoistCmp(
    () => tabContainer({
        model: {
            route: 'default.monitor',
            switcherPosition: 'left',
            tabs: [
                {id: 'status', icon: Icon.shieldCheck(), content: MonitorResultsPanel},
                {id: 'config', icon: Icon.settings(), content: MonitorEditorPanel}
            ]
        }
    })
);
