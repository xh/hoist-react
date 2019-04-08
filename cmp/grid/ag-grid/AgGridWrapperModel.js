import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {has} from 'lodash';

@HoistModel
export class AgGridWrapperModel {
    @bindable isReady = false;

    /** @member {GridApi} */
    agApi = null;

    /** @member {ColumnApi} */
    agColumnApi = null;

    onGridReady = ({api, columnApi}) => {
        this.agApi = api;
        this.agColumnApi = columnApi;
        this.setIsReady(true);
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