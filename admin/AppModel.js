/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseAppModel} from 'hoist/core';
import {action} from 'hoist/mobx';
import {TabContainerModel, TabPaneModel} from 'hoist/cmp';

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
import {ReadmePanel} from './tabs/readme/ReadmePanel';
import {ServicePanel} from './tabs/services/ServicePanel';
import {UserPanel} from './tabs/users/UserPanel';

export class AppModel extends BaseAppModel {

    tabs = this.createTabs();
    
    @action
    requestRefresh() {
        this.tabs.setLastRefreshRequest(Date.now());
    }

    //------------------------
    // Implementation
    //------------------------
    createTabs() {
        return new TabContainerModel('Root', 'h',
            new TabContainerModel('General', 'v',
                new TabPaneModel('About', AboutPanel),
                new TabPaneModel('Config', ConfigPanel),
                new TabPaneModel('Services', ServicePanel),
                new TabPaneModel('EhCache', EhCachePanel),
                new TabPaneModel('Dashboards', DashboardPanel),
                new TabPaneModel('Users', UserPanel),
                new TabPaneModel('Readme', ReadmePanel)
            ),
            new TabContainerModel('Logging', 'v',
                new TabPaneModel('Viewer', LogViewer),
                new TabPaneModel('Levels', LogLevelPanel)
            ),
            new TabContainerModel('Monitor', 'v',
                new TabPaneModel('Status', MonitorResultsPanel),
                new TabPaneModel('Edit Monitors', MonitorEditorPanel)
            ),
            new TabContainerModel('Client Activity', 'v',
                new TabPaneModel('Activity', ActivityPanel),
                new TabPaneModel('Client Errors', ClientErrorPanel),
                new TabPaneModel('Feedback', FeedbackPanel)
            ),
            new TabContainerModel('Preferences', 'v',
                new TabPaneModel('Preferences', PreferencePanel),
                new TabPaneModel('User Prefs', UserPreferencePanel)
            )
        );
    }
}