import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable, runInAction} from '@xh/hoist/mobx';
import {has, isNil} from 'lodash';

@HoistModel
export class AgGridModel {
    //------------------------
    // Grid Style
    //------------------------
    /** @member {boolean} */
    @bindable compact;
    /** @member {boolean} */
    @bindable rowBorders;
    /** @member {boolean} */
    @bindable stripeRows;
    /** @member {boolean} */
    @bindable showHover;
    /** @member {boolean} */
    @bindable showCellFocus;

    /** @member {GridApi} */
    @observable.ref agApi = null;

    /** @member {ColumnApi} */
    @observable.ref agColumnApi = null;

    /**
     * @param {Object} c - AgGridModel configuration.
     * @param {boolean} [c.compact] - true to render with a smaller font size and tighter padding.
     * @param {boolean} [c.rowBorders] - true to render row borders.
     * @param {boolean} [c.stripeRows] - true (default) to use alternating backgrounds for rows.
     * @param {boolean} [c.showHover] - true to highlight the currently hovered row.
     * @param {boolean} [c.showCellFocus] - true to highlight the focused cell with a border.
     */
    constructor({
        compact = false,
        showHover = false,
        rowBorders = false,
        stripeRows = true,
        showCellFocus = false
    } = {}) {
        this.setStyle({compact, showHover, rowBorders, stripeRows, showCellFocus});
    }

    get isReady() {
        return !isNil(this.agApi) && !isNil(this.agColumnApi);
    }

    onGridReady = ({api, columnApi}) => {
        runInAction(() => {
            this.agApi = api;
            this.agColumnApi = columnApi;
        });
    };

    get style() {
        const {compact, rowBorders, stripeRows, showHover, showCellFocus} = this;
        return {
            compact,
            rowBorders,
            stripeRows,
            showHover,
            showCellFocus
        };
    }

    @action
    setStyle({compact, rowBorders, stripeRows, showHover, showCellFocus}) {
        this.compact = compact;
        this.rowBorders = rowBorders;
        this.stripeRows = stripeRows;
        this.showHover = showHover;
        this.showCellFocus = showCellFocus;
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

    getFirstRowData() {
        let data = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (!data && node.data) data = node.data;
        });
        return data;
    }
}