/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {XH} from 'hoist';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';

import {adminTab} from '../AdminTab';
import {nameCol, heapSize, entries, status} from '../../columns/Columns';


@adminTab('EhCache')
@observer
export class EhCachePanel extends Component {

    @observable rows = null;
    @observable isLoading = false;
    @observable lastLoaded = null;

    render() {
        return gridPanel({
            title: 'EhCache',
            rows: toJS(this.rows),
            columns: [
                nameCol(),
                heapSize(),
                entries(),
                status()
            ]
        });
    }

    @action
    loadAsync() {
        this.isLoading = true;
        return XH
            .fetchJson({url: 'ehCacheAdmin/listCaches'
            })
            .then(rows => {
                console.log(rows);
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                throw e;
            }).catchDefault();
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
        this.lastLoaded = Date.now();
        this.isLoading = false;
    }
}
