/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {aboutPanel} from './about/AboutPanel';
import {ehCachePanel} from './ehcache/EhCachePanel';
import {servicePanel} from './services/ServicePanel';
import {userPanel} from './users/UserPanel';
import {webSocketPanel} from './websocket/WebSocketPanel';

export const generalTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.general',
            switcherPosition: 'left',
            tabs: [
                {id: 'about', icon: Icon.info(), content: aboutPanel},
                {id: 'services', icon: Icon.gears(), content: servicePanel},
                {id: 'ehCache', icon: Icon.database(), title: 'Caches', content: ehCachePanel},
                {id: 'users', icon: Icon.users(), content: userPanel},
                {id: 'webSockets', title: 'WebSockets', icon: Icon.bolt(), content: webSocketPanel}
            ]
        }
    })
);
