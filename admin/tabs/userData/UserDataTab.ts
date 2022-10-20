/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {preferencePanel} from './PreferencePanel';
import {userPreferencePanel} from './UserPreferencePanel';
import {jsonBlobPanel} from './JsonBlobPanel';

export const userDataTab = hoistCmp.factory(
    () => tabContainer({
        modelConfig: {
            route: 'default.userData',
            switcher: {orientation: 'left'},
            tabs: [
                {id: 'prefs', title: 'Preferences', icon: Icon.bookmark(), content: preferencePanel},
                {id: 'userPrefs', icon: Icon.users(), content: userPreferencePanel, refreshMode: 'onShowAlways'},
                {id: 'jsonBlobs', title: 'JSON Blobs', icon: Icon.json(), content: jsonBlobPanel, refreshMode: 'onShowAlways'}
            ]
        }
    })
);
