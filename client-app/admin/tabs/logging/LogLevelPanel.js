/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {restGrid, RestGridModel} from 'hoist/rest';
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@observer
export class LogLevelPanel extends Component {

    model = new RestGridModel({
        url: 'rest/logLevelAdmin',
        recordSpec: {
            fields: [
                {name: 'name', label: 'Log Name'},
                {name: 'defaultLevel', label: 'Initial'},
                {name: 'level', label: 'Override', lookup: 'levels'},
                {name: 'effectiveLevel', label: 'Effective'}
            ]
        },
        columns: [
            nameCol(),
            baseCol({field: 'defaultLevel', width: 80}),
            baseCol({field: 'level', width: 80}),
            baseCol({field: 'effectiveLevel', width: 80})
        ],
        editors: [
            {field: 'name'},
            {field: 'level', editable: false} // additions not allowed, might want a select instead of a suggest (in ext editable: false), obv can rename the prop
        ]
    });
    
    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
