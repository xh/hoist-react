/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';

import {logLevelPanel} from './LogLevelPanel';
import {logViewer} from './viewer/LogViewer';

export const loggingTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.logging',
            switcherPosition: 'left',
            tabs: [
                {id: 'viewer', icon: Icon.fileText(), content: logViewer, omit: !XH.getConf('xhEnableLogViewer')},
                {id: 'config', icon: Icon.settings(), content: logLevelPanel}
            ]
        }
    })
);
