/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';

import {XH, elem} from 'hoist';
import {loadMask} from 'hoist/cmp';
import {box} from 'hoist/layout';
import {observable, action, observer} from 'hoist/mobx';

import {Tile} from './Tile';

@observer
export class MonitorResultsPanel extends Component {

    @observable results = [];
    isLoading = false;

    render() {
        return box({
            items: [
                loadMask({isShowing: this.isLoading}),
                box({
                    overflow: 'scroll',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    style: {
                        color: 'white',
                        border: '1px solid white',
                        borderRadius: '3px'
                    },
                    items: this.results.map(it => elem(Tile, {check: it, key: it.name}))
                })
            ]
        });
    }

    loadAsync() {
        this.isLoading = true;
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
    completeLoad = (success, vals) => {
        this.results = success ? Object.values(vals) : [];
        this.isLoading = false;
    }
}