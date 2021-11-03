/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistAppModel, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {activityTab} from './tabs/activity/ActivityTab';
import {generalTab} from './tabs/general/GeneralTab';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {serverTab} from './tabs/server/ServerTab';
import {userDataTab} from './tabs/userData/UserDataTab';

export class AppModel extends HoistAppModel {

    @managed
    _tabModel;

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
                    {name: 'config', path: '/config'},
                    {name: 'users', path: '/users'},
                    {name: 'alertBanner', path: '/alertBanner'}
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
                name: 'server',
                path: '/server',
                children: [
                    {name: 'logViewer', path: '/logViewer'},
                    {name: 'logLevels', path: '/logLevels'},
                    {name: 'environment', path: '/environment'},
                    {name: 'services', path: '/services'},
                    {name: 'ehCache', path: '/ehCache'},
                    {name: 'webSockets', path: '/webSockets'}
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
            {id: 'activity', icon: Icon.analytics(), content: activityTab},
            {id: 'server', icon: Icon.server(), content: serverTab},
            {id: 'monitor', icon: Icon.shieldCheck(), content: monitorTab},
            {id: 'userData', icon: Icon.users(), content: userDataTab}
        ];
    }
}
