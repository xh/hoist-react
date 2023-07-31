/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistAppModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Route} from 'router5';
import {activityTab} from './tabs/activity/ActivityTab';
import {generalTab} from './tabs/general/GeneralTab';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {serverTab} from './tabs/server/ServerTab';
import {userDataTab} from './tabs/userData/UserDataTab';
import {rolesTab} from './tabs/roles/RolesTab';

export class AppModel extends HoistAppModel {
    static instance: AppModel;

    @managed
    tabModel: TabContainerModel;

    static get readonly() {
        return !XH.getUser().isHoistAdmin;
    }

    constructor() {
        super();

        this.tabModel = new TabContainerModel({
            route: 'default',
            switcher: false,
            tabs: this.createTabs()
        });

        // Enable managed autosize mode across Hoist Admin console grids.
        GridModel.DEFAULT_AUTOSIZE_MODE = 'managed';
    }

    override getRoutes(): Route[] {
        return [
            {
                name: 'default',
                path: '/admin',
                children: this.getTabRoutes()
            }
        ];
    }

    //------------------------
    // For override / extension
    //------------------------
    getAppMenuButtonExtraItems() {
        return [];
    }

    getTabRoutes(): Route[] {
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
                    {name: 'memory', path: '/memory'},
                    {name: 'webSockets', path: '/webSockets'}
                ]
            },
            {
                name: 'monitor',
                path: '/monitor',
                children: [
                    {name: 'status', path: '/status'},
                    {name: 'config', path: '/config'}
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
            },
            {
                name: 'roles',
                path: '/roles',
                children: [
                    {name: 'inspector', path: '/inspector'},
                    {name: 'visualizer', path: '/visualizer'}
                ]
            }
        ];
    }

    createTabs(): TabConfig[] {
        const showRoles = ['WRITE', 'READ'].includes(XH.getConf('xhAdminRoleController'));

        return [
            {
                id: 'general',
                icon: Icon.info(),
                content: generalTab
            },
            {
                id: 'activity',
                icon: Icon.analytics(),
                content: activityTab
            },
            {
                id: 'server',
                icon: Icon.server(),
                content: serverTab
            },
            {
                id: 'monitor',
                icon: Icon.shieldCheck(),
                content: monitorTab
            },
            {
                id: 'userData',
                icon: Icon.users(),
                content: userDataTab
            },
            {
                id: 'roles',
                icon: Icon.roles(),
                content: rolesTab,
                omit: !showRoles
            }
        ];
    }
}
