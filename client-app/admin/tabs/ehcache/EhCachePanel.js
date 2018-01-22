/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {XH} from 'hoist';
import {gridPanel} from 'hoist/ag-grid/GridPanel';
import {observer, observable, action, toJS} from 'hoist/mobx';
import {nameCol, heapSizeCol, entriesCol, statusCol} from '../../columns/Columns';

@observer
export class EhCachePanel extends Component {

    @observable rows = null;

    render() {
        return gridPanel({
            rows: toJS(this.rows),
            columns: [
                nameCol(),
                heapSizeCol(),
                entriesCol(),
                statusCol()
            ]
        });
    }

    loadAsync() {
        return XH
            .fetchJson({url: 'ehCacheAdmin/listCaches'})
            .then(rows => {
                this.completeLoad(true, rows);
            }).catch(e => {
                this.completeLoad(false, e);
                XH.handleException(e);
            });
    }

    @action
    completeLoad = (success, vals) => {
        this.rows = success ? vals : [];
    }
}
