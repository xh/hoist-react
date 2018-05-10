/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {HoistAppModel} from 'hoist/app';
import {action} from 'hoist/mobx';
import {TabContainerModel} from 'hoist/cmp';

import {AboutPanel} from './tabs/about/AboutPanel';
import {ActivityPanel} from './tabs/activity/ActivityPanel';
import {ConfigPanel} from './tabs/configs/ConfigPanel';
import {ClientErrorPanel} from './tabs/clienterrors/ClientErrorPanel';
import {FeedbackPanel} from './tabs/feedback/FeedbackPanel';
import {DashboardPanel} from './tabs/dashboards/DashboardPanel';
import {EhCachePanel} from './tabs/ehcache/EhCachePanel';
import {LogLevelPanel} from './tabs/logging/LogLevelPanel';
import {LogViewer} from './tabs/logging/viewer/LogViewer';
import {MonitorResultsPanel} from './tabs/monitor/MonitorResultsPanel';
import {MonitorEditorPanel} from './tabs/monitor/MonitorEditorPanel';
import {PreferencePanel} from './tabs/preferences/PreferencePanel';
import {UserPreferencePanel} from './tabs/preferences/UserPreferencePanel';
import {ServicePanel} from './tabs/services/ServicePanel';
import {UserPanel} from './tabs/users/UserPanel';

@HoistAppModel
export class AppModel {

    tabs = this.createTabContainer();
    
    @action
    requestRefresh() {
        this.tabs.setLastRefreshRequest(Date.now());
    }

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
    // Implementation
    //------------------------
    createTabContainer() {
        return new TabContainerModel({
            id: 'default',
            useRoutes: true,
            orientation: 'h',
            children: this.createTabs()
        });
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
                    {name: 'dashboards', path: '/dashboards'},
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
            },       {
                name: 'clientActivity',
                path: '/clientActivity',
                forwardTo: 'default.clientActivity.activity',
                children: [
                    {name: 'activity', path: '/activity'},
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
            {
                id: 'general',
                orientation: 'v',
                children: [
                    {id: 'about', component: AboutPanel},
                    {id: 'config', component: ConfigPanel},
                    {id: 'services', component: ServicePanel},
                    {id: 'ehCache', name: 'Caches', component: EhCachePanel},
                    {id: 'dashboards', component: DashboardPanel},
                    {id: 'users', component: UserPanel}
                ]
            }, {
                id: 'logging',
                orientation: 'v',
                children: [
                    {id: 'viewer', component: LogViewer},
                    {id: 'levels', component: LogLevelPanel}
                ]
            },
            {
                id: 'monitor',
                orientation: 'v',
                children: [
                    {id: 'status', component: MonitorResultsPanel},
                    {id: 'editMonitors', component: MonitorEditorPanel}
                ]
            },
            {
                id: 'clientActivity',
                orientation: 'v',
                children: [
                    {id: 'activity', component: ActivityPanel},
                    {id: 'clientErrors', component: ClientErrorPanel},
                    {id: 'feedback', component: FeedbackPanel}
                ]
            },
            {
                id: 'preferences',
                orientation: 'v',
                children: [
                    {id: 'prefs', component: PreferencePanel},
                    {id: 'userPrefs', component: UserPreferencePanel}
                ]
            }
        ];
    }

    destroy() {
        XH.safeDestroy(this.tabs);
    }
}
