/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action} from 'hoist/mobx';

import {TabSetStore} from './tabs/TabSetStore';
import {TabStore} from './tabs/TabStore';
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

class AppStore {

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
        return new TabSetStore('Root', 'h',
            new TabSetStore('General', 'v',
                new TabStore('About', AboutPanel),
                new TabStore('Config', ConfigPanel),
                new TabStore('Services', ServicePanel),
                new TabStore('EhCache', EhCachePanel),
                new TabStore('Dashboards', DashboardPanel),
                new TabStore('Users', UserPanel),
                new TabStore('Readme', ReadmePanel)
            ),
            new TabSetStore('Logging', 'v',
                new TabStore('Viewer', LogViewerPanel),
                new TabStore('Levels', LogLevelPanel)
            ),
            new TabSetStore('Monitor', 'v',
                new TabStore('Current Status', MonitorResultsPanel),
                new TabStore('Edit Monitors', MonitorEditorPanel)
            ),
            new TabSetStore('Client Activity', 'v',
                new TabStore('Activity', ActivityPanel),
                new TabStore('Client Errors', ClientErrorPanel),
                new TabStore('Feedback', FeedbackPanel)
            ),
            new TabSetStore('Preferences', 'v',
                new TabStore('Preferences', PreferencePanel),
                new TabStore('User Preferences', UserPreferencePanel)
            )
        );
    }
}

export const appStore = new AppStore();