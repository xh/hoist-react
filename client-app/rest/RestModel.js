/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH} from 'hoist';
import {setter, observer, observable, computed, action} from 'hoist/mobx';
import {isEmpty} from 'lodash';

@observer
export class RestModel extends Component {

    @setter @observable rows = null;
    @setter @observable rec = null;

    addRecord = () => {
        this.setRec({});
    }

    editRecord = (e) => {
        this.setRec(e.data);
    }

    saveRecord(data) {
        const method = this.isAdd ? 'POST' : 'PUT';
        XH.fetchJson({
            url: this.props.url,
            method: method,
            params: {data: JSON.stringify(data)} // for update maybe only send dirty fields (and id)
        }).then(resp => {
            this.setRec(null);
            this.updateRows(resp.data, method);
        }).catchDefault();
    }

    deleteRecord(selection) {
        const method = 'DELETE';
        return XH.fetchJson({
            url: `${this.props.url}/${selection.id}`,
            method: method
        }).then(resp => {
            this.updateRows(selection, method);
        }).catchDefault();
    }

    @action
    updateRows = (resp, method) => {
        const rows = this.rows,
            idx = rows.findIndex(it => it.id === resp.id);
        switch (method) {
            case 'POST':
                rows.push(resp);
                break;
            case 'PUT':
                rows[idx] = resp;
                break;
            case 'DELETE':
                rows.splice(idx, 1);
                break;
            default:
        }
    }

    //--------------
    // Implementation
    //--------------
    @computed get isAdd() { // not sure we need the computed, this isn't going to change the state of anything, is just queried when needed
        return isEmpty(this.rec);
    }

}