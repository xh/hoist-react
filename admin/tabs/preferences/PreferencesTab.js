/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';

import {PreferencePanel} from './PreferencePanel';
import {UserPreferencePanel} from './UserPreferencePanel';

export const PreferencesTab = hoistComponent(
    () => tabContainer({
        model: {
            route: 'default.preferences',
            switcherPosition: 'left',
            tabs: [
                {id: 'prefs', content: PreferencePanel},
                {id: 'userPrefs', content: UserPreferencePanel, reloadOnShow: true}
            ]
        }
    })
);