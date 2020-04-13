/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {preferencePanel} from './PreferencePanel';
import {userPreferencePanel} from './UserPreferencePanel';

export const preferencesTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.preferences',
            switcherPosition: 'left',
            tabs: [
                {id: 'prefs', icon: Icon.bookmark(), content: preferencePanel},
                {id: 'userPrefs', icon: Icon.users(), content: userPreferencePanel, reloadOnShow: true}
            ]
        }
    })
);