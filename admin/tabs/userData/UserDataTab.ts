/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {jsonBlobPanel} from './jsonblob/JsonBlobPanel';
import {preferencePanel} from './prefs/PreferencePanel';
import {userPreferencePanel} from './prefs/UserPreferencePanel';

export const userDataTab = hoistCmp.factory(() =>
    tabContainer({
        modelConfig: {
            route: 'default.userData',
            switcher: {orientation: 'left', testId: 'user-data-tab-switcher'},
            tabs: [
                {
                    id: 'prefs',
                    title: 'Preferences',
                    icon: Icon.bookmark(),
                    content: preferencePanel
                },
                {
                    id: 'userPrefs',
                    icon: Icon.users(),
                    content: userPreferencePanel,
                    refreshMode: 'onShowAlways'
                },
                {
                    id: 'jsonBlobs',
                    title: 'JSON Blobs',
                    icon: Icon.json(),
                    content: jsonBlobPanel,
                    refreshMode: 'onShowAlways'
                }
            ]
        }
    })
);
