/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {HoistAppModel, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {without} from 'lodash';
import {Route} from 'router5';
import {activityTrackingPanel} from './tabs/activity/tracking/ActivityTrackingPanel';
import {clientsPanel} from './tabs/clients/ClientsPanel';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {instancesTab, clusterObjectsPanel} from '@xh/hoist/admin/tabs/cluster';
import {aboutPanel, alertBannerPanel, configPanel} from '@xh/hoist/admin/tabs/general';
import {
    jsonBlobPanel,
    userPreferencePanel,
    rolePanel,
    userPanel
} from '@xh/hoist/admin/tabs/userData';

export class AppModel extends HoistAppModel {
    tabModel: TabContainerModel;

    viewManagerModels: Record<string, ViewManagerModel> = {};

    static get readonly() {
        return !XH.getUser().isHoistAdmin;
    }

    constructor() {
        super();

        this.tabModel = new TabContainerModel({
            route: 'default',
            tabs: this.createTabs()
        });

        // Enable managed autosize mode across Hoist Admin console grids.
        GridModel.DEFAULT_AUTOSIZE_MODE = 'managed';
    }

    override async initAsync() {
        await this.initViewManagerModelsAsync();
        await super.initAsync();
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
                    {name: 'feedback', path: '/feedback'},
                    {name: 'alertBanner', path: '/alertBanner'}
                ]
            },
            {
                name: 'servers',
                path: '/servers',
                children: [
                    {
                        name: 'instances',
                        path: '/instances',
                        children: [
                            {name: 'logs', path: '/logs'},
                            {name: 'memory', path: '/memory'},
                            {name: 'jdbcPool', path: '/jdbcPool'},
                            {name: 'environment', path: '/environment'},
                            {name: 'services', path: '/services'}
                        ]
                    },
                    {name: 'objects', path: '/objects'}
                ]
            },
            {
                name: 'clients',
                path: '/clients'
            },
            {
                name: 'monitors',
                path: '/monitors'
            },
            {
                name: 'activity',
                path: '/activity'
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
        const conf = XH.getConf('xhAdminAppConfig', {});

        return [
            {
                id: 'general',
                icon: Icon.info(),
                content: {
                    tabs: [
                        {id: 'about', icon: Icon.info(), content: aboutPanel},
                        {id: 'config', icon: Icon.settings(), content: configPanel},
                        {id: 'alertBanner', icon: Icon.bullhorn(), content: alertBannerPanel}
                    ]
                }
            },
            {
                id: 'servers',
                icon: Icon.server(),
                content: {
                    tabs: [
                        {id: 'instances', icon: Icon.server(), content: instancesTab},
                        {id: 'objects', icon: Icon.boxFull(), content: clusterObjectsPanel}
                    ]
                }
            },
            {
                id: 'clients',
                icon: Icon.desktop(),
                content: clientsPanel
            },
            {
                id: 'monitors',
                icon: Icon.shieldCheck(),
                content: monitorTab
            },
            {
                id: 'userData',
                icon: Icon.users(),
                content: {
                    refreshMode: 'onShowAlways',
                    tabs: [
                        {
                            id: 'users',
                            icon: Icon.users(),
                            content: userPanel,
                            omit: conf['hideUsersTab']
                        },
                        {
                            id: 'roles',
                            icon: Icon.idBadge(),
                            content: rolePanel
                        },
                        {
                            id: 'prefs',
                            title: 'Preferences',
                            icon: Icon.bookmark(),
                            content: userPreferencePanel
                        },
                        {
                            id: 'jsonBlobs',
                            title: 'JSON Blobs',
                            icon: Icon.json(),
                            content: jsonBlobPanel
                        }
                    ]
                }
            },
            {
                id: 'activity',
                title: 'User Activity',
                icon: Icon.analytics(),
                content: activityTrackingPanel
            }
        ];
    }

    /** Open the primary business-facing application, typically 'app'. */
    openPrimaryApp() {
        const appCode = this.getPrimaryAppCode();
        XH.openWindow(`/${appCode}`, appCode);
    }

    getPrimaryAppCode() {
        const appCodes = without(XH.clientApps, XH.clientAppCode, 'mobile');
        return appCodes.find(it => it === 'app') ?? appCodes[0];
    }

    async initViewManagerModelsAsync() {
        this.viewManagerModels.activityTracking = await ViewManagerModel.createAsync({
            type: 'xhAdminActivityTrackingView',
            typeDisplayName: 'View',
            manageGlobal: XH.getUser().isHoistAdmin
        });
    }
}
