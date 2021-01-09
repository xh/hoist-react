/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistAppModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {activityTab} from './tabs/activity/ActivityTab';
import {configTab} from './tabs/config/ConfigTab';
import {generalTab} from './tabs/general/GeneralTab';
import {loggingTab} from './tabs/logging/LoggingTab';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {userDataTab} from './tabs/userData/UserDataTab';

@HoistAppModel
export class AppModel {

    @managed
    _tabModel

    getRoutes() {
        return [
            {
                name: 'default',
                path: '/admin',
                children: this.getTabRoutes()
            }
        ];
    }

    get tabModel() {
        if (!this._tabModel) {
            this._tabModel = new TabContainerModel({
                route: 'default',
                switcher: false,
                tabs: this.createTabs()
            });
        }
        return this._tabModel;
    }

    //------------------------
    // For override / extension
    //------------------------
    getTabRoutes() {
        return [
            {
                name: 'general',
                path: '/general',
                children: [
                    {name: 'about', path: '/about'},
                    {name: 'services', path: '/services'},
                    {name: 'ehCache', path: '/ehCache'},
                    {name: 'users', path: '/users'},
                    {name: 'webSockets', path: '/webSockets'}
                ]
            },
            {
                name: 'config',
                path: '/config'
            },
            {
                name: 'logging',
                path: '/logging',
                children: [
                    {name: 'viewer', path: '/viewer'},
                    {name: 'levels', path: '/levels'}
                ]
            },
            {
                name: 'monitor',
                path: '/monitor',
                children: [
                    {name: 'status', path: '/status'},
                    {name: 'config', path: '/config'},
                    {name: 'memory', path: '/memory'}
                ]
            },
            {
                name: 'activity',
                path: '/activity',
                children: [
                    {name: 'tracking', path: '/tracking'},
                    {name: 'clientErrors', path: '/clientErrors'},
                    {name: 'feedback', path: '/feedback'}
                ]
            },
            {
                name: 'userData',
                path: '/userData',
                children: [
                    {name: 'prefs', path: '/prefs'},
                    {name: 'userPrefs', path: '/userPrefs'},
                    {name: 'jsonBlobs', path: '/jsonBlobs'}
                ]
            }
        ];
    }

    createTabs() {
        return [
            {id: 'general', icon: Icon.info(), content: generalTab},
            {id: 'config', icon: Icon.settings(), content: configTab},
            {id: 'activity', icon: Icon.analytics(), content: activityTab},
            {id: 'logging', icon: Icon.fileText(), content: loggingTab},
            {id: 'monitor', icon: Icon.shieldCheck(), content: monitorTab, omit: !XH.getConf('xhEnableMonitoring', true)},
            {id: 'userData', icon: Icon.users(), content: userDataTab}
        ];
    }
}
