/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from 'hoist/mobx';

import {TabSetModel} from './tabs/TabSetModel';
import {TabModel} from './tabs/TabModel';
import {AboutPanel} from './tabs/about/AboutPanel';
import {ActivityPanel} from './tabs/activity/ActivityPanel';
import {ConfigPanel} from './tabs/configs/ConfigPanel';
import {ClientErrorPanel} from './tabs/clienterrors/ClientErrorPanel';
import {FeedbackPanel} from './tabs/feedback/FeedbackPanel';
import {DashboardPanel} from './tabs/dashboards/DashboardPanel';
import {EhCachePanel} from './tabs/ehcache/EhCachePanel';
import {LogLevelPanel} from './tabs/logging/LogLevelPanel';
import {LogViewerPanel} from './tabs/logging/LogViewerPanel';
import {MonitorResultsPanel} from './tabs/monitor/MonitorResultsPanel';
import {MonitorEditorPanel} from './tabs/monitor/MonitorEditorPanel';
import {PreferencePanel} from './tabs/preferences/PreferencePanel';
import {UserPreferencePanel} from './tabs/preferences/UserPreferencePanel';
import {ReadmePanel} from './tabs/readme/ReadmePanel';
import {ServicePanel} from './tabs/services/ServicePanel';
import {UserPanel} from './tabs/users/UserPanel';

class AppModel {

    @observable tabs = this.createTabs();
    @observable lastRefreshRequest = null;
    
    @action
    requestRefresh = () => {
        this.lastRefreshRequest = Date.now();
    }

    //------------------------
    // Implementation
    //------------------------
    createTabs() {
        return new TabSetModel('Root', 'h',
            new TabSetModel('General', 'v',
                new TabModel('About', AboutPanel),
                new TabModel('Config', ConfigPanel),
                new TabModel('Services', ServicePanel),
                new TabModel('EhCache', EhCachePanel),
                new TabModel('Dashboards', DashboardPanel),
                new TabModel('Users', UserPanel),
                new TabModel('Readme', ReadmePanel)
            ),
            new TabSetModel('Logging', 'v',
                new TabModel('Viewer', LogViewerPanel),
                new TabModel('Levels', LogLevelPanel)
            ),
            new TabSetModel('Monitor', 'v',
                new TabModel('Current Status', MonitorResultsPanel),
                new TabModel('Edit Monitors', MonitorEditorPanel)
            ),
            new TabSetModel('Client Activity', 'v',
                new TabModel('Activity', ActivityPanel),
                new TabModel('Client Errors', ClientErrorPanel),
                new TabModel('Feedback', FeedbackPanel)
            ),
            new TabSetModel('Preferences', 'v',
                new TabModel('Preferences', PreferencePanel),
                new TabModel('User Preferences', UserPreferencePanel)
            )
        );
    }
}

export const appModel = new AppModel();