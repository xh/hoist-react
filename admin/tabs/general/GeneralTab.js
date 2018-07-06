/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {tabContainer, TabContainerModel} from '@xh/hoist/cmp/tab';

import {AboutPanel} from './about/AboutPanel';
import {ConfigPanel} from './configs/ConfigPanel';
import {ServicePanel} from './services/ServicePanel';
import {EhCachePanel} from './ehcache/EhCachePanel';
import {UserPanel} from './users/UserPanel';

@HoistComponent()
export class GeneralTab extends Component {

    localModel = new TabContainerModel({
        panes: [
            {id: 'about', content: AboutPanel},
            {id: 'config', content: ConfigPanel},
            {id: 'services', content: ServicePanel},
            {id: 'ehCache', name: 'Caches', content: EhCachePanel},
            {id: 'users', content: UserPanel}
        ]
    });

    async loadAsync() {
        this.model.requestRefresh()
    }

    render() {
        return tabContainer({model: this.model, switcherPosition: 'left'});
    }
}
