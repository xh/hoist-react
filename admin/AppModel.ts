/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {instancesTab} from '@xh/hoist/admin/tabs/cluster/instances/InstancesTab';
import {clusterObjectsPanel} from '@xh/hoist/admin/tabs/cluster/objects/ClusterObjectsPanel';
import {aboutPanel} from '@xh/hoist/admin/tabs/general/about/AboutPanel';
import {alertBannerPanel} from '@xh/hoist/admin/tabs/general/alertBanner/AlertBannerPanel';
import {configPanel} from '@xh/hoist/admin/tabs/general/config/ConfigPanel';
import {jsonBlobPanel} from '@xh/hoist/admin/tabs/userData/jsonblob/JsonBlobPanel';
import {userPreferencePanel} from '@xh/hoist/admin/tabs/userData/prefs/UserPreferencePanel';
import {rolePanel} from '@xh/hoist/admin/tabs/userData/roles/RolePanel';
import {userPanel} from '@xh/hoist/admin/tabs/userData/users/UserPanel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {HoistAppModel, XH} from '@xh/hoist/core';
import {NavigationEntry} from '@xh/hoist/core/impl/NavigationManager';
import {Icon} from '@xh/hoist/icon';
import {isEmpty, without} from 'lodash';
import {Route} from 'router5';
import {activityTrackingPanel} from './tabs/activity/tracking/ActivityTrackingPanel';
import {clientsPanel} from './tabs/clients/ClientsPanel';
import {monitorTab} from './tabs/monitor/MonitorTab';

export class AppModel extends HoistAppModel {
    tabModel: TabContainerModel;

    viewManagerModels: Record<string, ViewManagerModel> = {};

    static get readonly() {
        return !XH.getUser().isHoistAdmin;
    }

    constructor() {
        super();
        // Enable managed autosize mode across Hoist Admin console grids.
        GridModel.DEFAULT_AUTOSIZE_MODE = 'managed';
    }

    override async initAsync() {
        await this.initViewManagerModelsAsync();
        await super.initAsync();
        this.tabModel = new TabContainerModel({
            ...XH.appContainerModel.navigationManager.tabContainerConfig,
            switcher: false
        });
    }

    override getNavSpec() {
        return {
            id: 'default',
            path: '/admin',
            children: this.getNavigationManagerConfiguration()
        };
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
                children: [
                    {id: 'about', icon: Icon.info(), content: aboutPanel},
                    {id: 'config', icon: Icon.settings(), content: configPanel},
                    {
                        id: 'alertBanner',
                        icon: Icon.bullhorn(),
                        content: alertBannerPanel
                    }
                ]
            },
            {
                id: 'servers',
                icon: Icon.server(),
                children: [
                    {
                        id: 'instances',
                        icon: Icon.server(),
                        content: instancesTab
                    },
                    {id: 'objects', icon: Icon.boxFull(), content: clusterObjectsPanel}
                ]
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
                children: [
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
            },
            {
                id: 'activity',
                title: 'User Activity',
                icon: Icon.analytics(),
                content: activityTrackingPanel
            }
        ];
    }

    getNavigationManagerConfiguration(): NavigationEntry[] {
        return this.constructNavigationConfiguration(this.getTabRoutes(), this.createTabs());
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

    //------------------------
    // Implementation
    //------------------------

    /** Construct our Navigation Configuration object using the overridable
     * `getTabRoutes` and `createTabs` methods to support backwards compatibility.*/
    private constructNavigationConfiguration(
        routes: Route[],
        tabs: TabConfig[]
    ): NavigationEntry[] {
        const tabMap = new Map(tabs.map(tab => [tab.id, tab]));

        return routes.map(route => {
            const tab = tabMap.get(route.name);

            const merged: NavigationEntry = {
                id: route.name,
                path: route.path,
                ...(route.canActivate && {canActivate: route.canActivate}),
                ...(route.forwardTo && {forwardTo: route.forwardTo}),
                ...(route.encodeParams && {encodeParams: route.encodeParams}),
                ...(route.decodeParams && {decodeParams: route.decodeParams}),
                ...(route.defaultParams && {defaultParams: route.defaultParams}),
                ...(tab && {
                    icon: tab.icon,
                    title: tab.title,
                    tooltip: tab.tooltip,
                    disabled: tab.disabled,
                    excludeFromSwitcher: tab.excludeFromSwitcher,
                    showRemoveAction: tab.showRemoveAction,
                    content: tab.content,
                    renderMode: tab.renderMode,
                    refreshMode: tab.refreshMode,
                    omit: tab.omit,
                    xhImpl: tab.xhImpl,
                    switcher: tab.switcher
                })
            };

            if (!isEmpty(route.children) || !isEmpty(tab?.children)) {
                merged.children = this.constructNavigationConfiguration(
                    route.children ?? [],
                    tab?.children ?? []
                );
            }

            return merged;
        });
    }
}
