/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistAppModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Route} from 'router5';
import {activityTab} from './tabs/activity/ActivityTab';
import {generalTab} from './tabs/general/GeneralTab';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {clusterTab} from '@xh/hoist/admin/tabs/cluster/ClusterTab';
import {userDataTab} from './tabs/userData/UserDataTab';

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
                    {name: 'alertBanner', path: '/alertBanner'}
                ]
            },
            {
                name: 'cluster',
                path: '/cluster',
                children: [
                    {name: 'logs', path: '/logs'},
                    {name: 'memory', path: '/memory'},
                    {name: 'jdbcPool', path: '/jdbcPool'},
                    {name: 'environment', path: '/environment'},
                    {name: 'services', path: '/services'},
                    {name: 'objects', path: '/objects'},
                    {name: 'hibernate', path: '/hibernate'},
                    {name: 'webSockets', path: '/webSockets'}
                ]
            },
            {
                name: 'monitors',
                path: '/monitors'
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
                    {name: 'users', path: '/users'},
                    {name: 'roles', path: '/roles'},
                    {name: 'prefs', path: '/prefs'},
                    {name: 'jsonBlobs', path: '/jsonBlobs'}
                ]
            }
        ];
    }

    createTabs(): TabConfig[] {
        return [
            {
                id: 'general',
                icon: Icon.info(),
                content: generalTab
            },
            {
                id: 'cluster',
                icon: Icon.server(),
                content: clusterTab
            },
            {
                id: 'monitors',
                icon: Icon.shieldCheck(),
                content: monitorTab
            },
            {
                id: 'userData',
                icon: Icon.users(),
                content: userDataTab
            },
            {
                id: 'activity',
                title: 'User Activity',
                icon: Icon.analytics(),
                content: activityTab
            }
        ];
    }
}
