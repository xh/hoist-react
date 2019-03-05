/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistAppModel, managed} from '@xh/hoist/core';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

import {ActivityTab} from './tabs/activity/ActivityTab';
import {GeneralTab} from './tabs/general/GeneralTab';
import {LoggingTab} from './tabs/logging/LoggingTab';
import {MonitorTab} from './tabs/monitor/MonitorTab';
import {PreferencesTab} from './tabs/preferences/PreferencesTab';

@HoistAppModel
export class AppModel {

    @managed
    tabModel = new TabContainerModel({
        route: 'default',
        switcherPosition: 'none',
        tabs: this.createTabs()
    });
    
    getRoutes() {
        return [
            {
                name: 'default',
                path: '/admin',
                forwardTo: 'default.general',
                children: this.getTabRoutes()
            }
        ];
    }

    //------------------------
    // For override / extension
    //------------------------
    getTabRoutes() {
        return [
            {
                name: 'general',
                path: '/general',
                forwardTo: 'default.general.about',
                children: [
                    {name: 'about', path: '/about'},
                    {name: 'config', path: '/config'},
                    {name: 'services', path: '/services'},
                    {name: 'ehCache', path: '/ehCache'},
                    {name: 'users', path: '/users'}
                ]
            },
            {
                name: 'logging',
                path: '/logging',
                forwardTo: 'default.logging.viewer',
                children: [
                    {name: 'viewer', path: '/viewer'},
                    {name: 'levels', path: '/levels'}
                ]
            },
            {
                name: 'monitor',
                path: '/monitor',
                forwardTo: 'default.monitor.status',
                children: [
                    {name: 'status', path: '/status'},
                    {name: 'editMonitors', path: '/editMonitors'}
                ]
            },
            {
                name: 'activity',
                path: '/activity',
                forwardTo: 'default.activity.tracking',
                children: [
                    {name: 'tracking', path: '/tracking'},
                    {name: 'clientErrors', path: '/clientErrors'},
                    {name: 'feedback', path: '/feedback'}
                ]
            },
            {
                name: 'preferences',
                path: '/preferences',
                forwardTo: 'default.preferences.prefs',
                children: [
                    {name: 'prefs', path: '/prefs'},
                    {name: 'userPrefs', path: '/userPrefs'}
                ]
            }
        ];
    }

    createTabs() {
        return [
            {id: 'general', content: GeneralTab},
            {id: 'activity', content: ActivityTab},
            {id: 'logging', content: LoggingTab},
            {id: 'monitor', content: MonitorTab},
            {id: 'preferences', content: PreferencesTab}
        ];
    }
}
