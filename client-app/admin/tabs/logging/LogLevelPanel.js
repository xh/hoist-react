/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {nameCol, defaultLevel, level, effectiveLevel} from '../../columns/Columns';
import {Ref, resolve} from 'hoist';
import {restGrid} from 'hoist/rest/RestGrid';

@observer
export class LogLevelPanel extends Component {
    url = 'rest/logLevelAdmin';
    columns = [
        nameCol(),
        defaultLevel(),
        level(),
        effectiveLevel()
    ]
    ref = new Ref();

    render() {
        return restGrid({columns: this.columns, url: this.url, ref: this.ref.callback});
    }

    loadAsync() {
        return this.ref.value ? this.ref.value.loadAsync() : resolve();
    }
}
