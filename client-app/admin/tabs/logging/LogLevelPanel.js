/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {nameCol, defaultLevelCol, levelCol, effectiveLevelCol} from '../../columns/Columns';
import {Ref, resolve} from 'hoist';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class LogLevelPanel extends Component {

    url = 'rest/logLevelAdmin';

    columns = [
        nameCol(),
        defaultLevelCol(),
        levelCol(),
        effectiveLevelCol()
    ];

    editors = [
        {name: 'name', allowBlank: false},
        {name: 'level', editable: false} // must choose from a predefined list (functionality not yet implemented into restForm)
    ];

    ref = new Ref();

    render() {
        return restGrid({url: this.url, columns: this.columns, editors: this.editors, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }
}
