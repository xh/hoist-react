/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameCol, defaultLevelCol, levelCol, effectiveLevelCol} from '../../columns/Columns';

@observer
export class LogLevelPanel extends Component {

    model = new RestGridModel({
        url: 'rest/logLevelAdmin',
        columns: [
            nameCol(),
            defaultLevelCol(),
            levelCol(),
            effectiveLevelCol()
        ],
        editors: [
            {name: 'name', allowBlank: false},
            {name: 'level', editable: false}
        ]
    });
    
    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
