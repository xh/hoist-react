/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {tabContainer, TabContainerModel} from '@xh/hoist/desktop/cmp/tab';

import {PreferencePanel} from './PreferencePanel';
import {UserPreferencePanel} from './UserPreferencePanel';


@HoistComponent
export class PreferencesTab extends Component {

    model = new TabContainerModel({
        route: 'default.preferences',
        tabs: [
            {id: 'prefs', content: PreferencePanel},
            {id: 'userPrefs', content: UserPreferencePanel, reloadOnShow: true}
        ]
    });

    async loadAsync() {
        this.model.requestRefresh();
    }
    
    render() {
        return tabContainer({model: this.model, switcherPosition: 'left'});
    }
}
