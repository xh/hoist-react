/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';

import {LogLevelPanel} from './LogLevelPanel';
import {LogViewer} from './viewer/LogViewer';

export const LoggingTab = hoistComponent(
    () => tabContainer({
        model: {
            route: 'default.logging',
            switcherPosition: 'left',
            tabs: [
                {id: 'viewer', content: LogViewer},
                {id: 'levels', content: LogLevelPanel}
            ]
        }
    })
);
