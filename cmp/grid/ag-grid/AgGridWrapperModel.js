import {HoistModel} from '@xh/hoist/core';
import {observable, runInAction} from '@xh/hoist/mobx';
import {has, isNil} from 'lodash';

@HoistModel
export class AgGridWrapperModel {
    /** @member {GridApi} */
    @observable.ref agApi = null;

    /** @member {ColumnApi} */
    @observable.ref agColumnApi = null;

    get isReady() {
        return !isNil(this.agApi) && !isNil(this.agColumnApi);
    }

    onGridReady = ({api, columnApi}) => {
        runInAction(() => {
            this.agApi = api;
            this.agColumnApi = columnApi;
        });
    };

    getFirstRowData() {
        let data = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (!data && node.data) data = node.data;
        });
        return data;
    }

    get expandState() {
        const expandState = {};
        this.agApi.forEachNode(node => {
            if (!node.group) return;

            const {field, key} = node;
            if (!has(expandState, field)) {
                expandState[field] = {};
            }

            expandState[field][key] = node.expanded;
        });
    }

    setExpandState(expandState) {
        const {agApi} = this;
        let wasChanged = false;
        agApi.forEachNode(node => {
            if (!node.group) return;

            const {field, key} = node,
                expanded = expandState[field] ? !!expandState[field][key] : false;

            if (node.expanded !== expanded) {
                node.expanded = expanded;
                wasChanged = true;
            }
        });

        if (wasChanged) {
            agApi.onGroupExpandedOrCollapsed();
        }
    }
}