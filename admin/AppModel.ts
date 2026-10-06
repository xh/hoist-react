/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {HoistAppModel, HoistRoute, InitContext, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {without} from 'lodash';
import {RoleModuleConfig} from './tabs/userData/roles/Types';
import {activityTrackingPanel} from './tabs/activity/tracking/ActivityTrackingPanel';
import {clientsPanel} from './tabs/clients/ClientsPanel';
import {monitorTab} from './tabs/monitor/MonitorTab';
import {instancesTab, metricsPanel, clusterObjectsPanel} from '@xh/hoist/admin/tabs/cluster';
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

    /** Role-module config, loaded once at init and shared with the Roles tab. */
    roleModuleConfig: RoleModuleConfig = null;

    static get readonly() {
        return !XH.getUser().isHoistAdmin;
    }

    constructor() {
        super();

        // Enable managed autosize mode across Hoist Admin console grids.
        GridModel.defaults.autosizeMode = 'managed';
    }

    override async initAsync(ctx: InitContext) {
        await this.loadRoleModuleConfigAsync(ctx);

        this.tabModel = new TabContainerModel({
            route: 'default',
            tabs: this.createTabs()
        });

        await this.initViewManagerModelsAsync(ctx);
        await super.initAsync(ctx);
    }

    override getRoutes(): HoistRoute[] {
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

    getTabRoutes(): HoistRoute[] {
        return [
            {
                name: 'general',
                path: '/general',
                children: [
                    {name: 'about', path: '/about'},
                    {name: 'config', path: '/config'},
                    {name: 'alertBanner', path: '/alertBanner'},
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
                    {name: 'metrics', path: '/metrics'},
                    {name: 'objects', path: '/objects'},
                    {name: 'jsonBlobs', path: '/jsonBlobs'},
                    {name: 'users', path: '/users'},
                    {name: 'roles', path: '/roles'},
                    {name: 'prefs', path: '/prefs'}
                ]
            },
            {
                name: 'monitors',
                path: '/monitors'
            },
            {
                name: 'clients',
                path: '/clients'
            },
            {
                name: 'activity',
                path: '/activity'
            }
        ];
    }

    createTabs(): TabConfig[] {
        const conf = XH.getConf('xhAdminAppConfig', {}),
            rolesEnabled = this.roleModuleConfig?.enabled ?? false;

        return [
            {
                id: 'general',
                icon: Icon.home(),
                content: {
                    switcher: {
                        mode: 'static',
                        groups: [
                            {key: 'app', title: 'Application'},
                            {key: 'servers', title: 'Servers & Data'},
                            {
                                key: 'userData',
                                title: rolesEnabled ? 'Users & Roles' : 'Users'
                            }
                        ]
                    },
                    tabs: [
                        ...this.groupTabs('app', [
                            {id: 'about', icon: Icon.info(), content: aboutPanel},
                            {id: 'config', icon: Icon.settings(), content: configPanel},
                            {id: 'alertBanner', icon: Icon.bullhorn(), content: alertBannerPanel}
                        ]),
                        ...this.groupTabs('servers', [
                            {id: 'instances', icon: Icon.server(), content: instancesTab},
                            {id: 'metrics', icon: Icon.gauge(), content: metricsPanel},
                            {id: 'objects', icon: Icon.boxFull(), content: clusterObjectsPanel},
                            {
                                id: 'jsonBlobs',
                                title: 'JSON Blobs',
                                icon: Icon.json(),
                                content: jsonBlobPanel,
                                refreshMode: 'onShowAlways'
                            }
                        ]),
                        ...this.groupTabs('userData', [
                            {
                                id: 'users',
                                icon: Icon.users(),
                                content: userPanel,
                                refreshMode: 'onShowAlways',
                                omit: conf['hideUsersTab']
                            },
                            {
                                id: 'roles',
                                icon: Icon.idBadge(),
                                content: rolePanel,
                                refreshMode: 'onShowAlways',
                                omit: !rolesEnabled
                            },
                            {
                                id: 'prefs',
                                title: 'Preferences',
                                icon: Icon.bookmark(),
                                content: userPreferencePanel,
                                refreshMode: 'onShowAlways'
                            }
                        ])
                    ]
                }
            },
            {
                id: 'monitors',
                icon: Icon.shieldCheck(),
                content: monitorTab
            },
            {
                id: 'clients',
                icon: Icon.desktop(),
                content: clientsPanel
            },
            {
                id: 'activity',
                title: 'Activity',
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

    async initViewManagerModelsAsync(ctx: InitContext) {
        this.viewManagerModels.activityTracking = await ViewManagerModel.createAsync(
            {
                type: 'xhAdminActivityTrackingView',
                typeDisplayName: 'View',
                manageGlobal: XH.getUser().isHoistAdmin
            },
            ctx
        );
    }

    //----------------
    // Implementation
    //----------------
    private groupTabs(group: string, tabs: TabConfig[]): TabConfig[] {
        return tabs.map(it => ({...it, group}));
    }

    private async loadRoleModuleConfigAsync(ctx: InitContext) {
        // Load role config up-front to title/show the Roles tab (see createTabs).
        // Never block startup if it can't load - the tab defaults to hidden.
        try {
            this.roleModuleConfig = await this.runner(ctx)
                .span('loadRoleModuleConfig')
                .fetchJson({url: 'roleAdmin/config', timeout: 10 * SECONDS});
        } catch (e) {
            XH.handleException(e, {
                message: 'Unable to load roles configuration',
                alertType: 'toast'
            });
        }
    }
}
