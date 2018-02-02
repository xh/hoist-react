/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';

import {XH} from 'hoist';
import {box} from 'hoist/layout';
import {observable, action, observer} from 'hoist/mobx';

import {tile} from './Tile';

@observer
export class MonitorResultsPanel extends Component {

    @observable results = [];

    render() {
        return box({
            overflow: 'auto',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            items: this.results.map(it => tile({check: it, key: it.name}))
        });
    }

    @action
    loadAsync() {
        return XH
            .fetchJson({url: 'monitorAdmin/results'})
            .then(rows => {
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad(success, vals) {
        this.results = success ? Object.values(vals) : [];
    }
}