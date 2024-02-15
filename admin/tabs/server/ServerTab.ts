/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {connPoolMonitorPanel} from '@xh/hoist/admin/tabs/server/connectionpool/ConnPoolMonitorPanel';
import {serverEnvPanel} from '@xh/hoist/admin/tabs/server/environment/ServerEnvPanel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {ehCachePanel} from './ehcache/EhCachePanel';
import {logLevelPanel} from './logLevel/LogLevelPanel';
import {logViewer} from './logViewer/LogViewer';
import {memoryMonitorPanel} from './memory/MemoryMonitorPanel';
import {servicePanel} from './services/ServicePanel';
import {webSocketPanel} from './websocket/WebSocketPanel';

export const serverTab = hoistCmp.factory(() =>
    tabContainer({
        modelConfig: {
            route: 'default.server',
            switcher: {orientation: 'left', testId: 'server-tab-switcher'},
            tabs: [
                {id: 'logViewer', icon: Icon.fileText(), content: logViewer},
                {id: 'logLevels', icon: Icon.settings(), content: logLevelPanel},
                {id: 'memory', icon: Icon.server(), content: memoryMonitorPanel},
                {id: 'connectionPool', icon: Icon.database(), content: connPoolMonitorPanel},
                {id: 'environment', icon: Icon.globe(), content: serverEnvPanel},
                {id: 'services', icon: Icon.gears(), content: servicePanel},
                {id: 'ehCache', icon: Icon.memory(), title: 'Caches', content: ehCachePanel},
                {id: 'webSockets', title: 'WebSockets', icon: Icon.bolt(), content: webSocketPanel}
            ]
        }
    })
);
