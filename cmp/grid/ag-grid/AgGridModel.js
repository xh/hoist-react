import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
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

    get selectedRowNodeIds() {
        return this.agApi.getSelectedRows().map(it => it.id);
    }

    setSelectedRowNodeIds(ids) {
        const {agApi} = this;
        agApi.deselectAll();
        ids.forEach(id => {
            const node = agApi.getRowNode(id);
            if (node) node.setSelected(true);
        });
    }

    /**
     * @returns {Object} the data associated with the first non-group row in the grid.
     */
    getFirstRowData() {
        let data = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (!data && node.data) data = node.data;
        });
        return data;
    }

    /**
     * Allow Key Presses to navigate selection.
     *
     * This is *loosely* based on an example from the AG Docs.
     * It has been modified for efficiency and to allow multi-selection.
     */
    navigateSelection(agParams) {
        const {nextCellDef, previousCellDef, event} = agParams,
            shiftKey = event.shiftKey,
            prevIndex = previousCellDef ? previousCellDef.rowIndex : null,
            nextIndex = nextCellDef ? nextCellDef.rowIndex : null,
            {agApi} = this,
            prevNode = prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null,
            nextNode = nextIndex != null ? agApi.getDisplayedRowAtIndex(nextIndex) : null,
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;

        switch (agParams.key) {
            case KEY_DOWN:
            case KEY_UP:
                if (nextNode) {
                    if (!shiftKey || !prevNode.isSelected()) {
                        // 0) Simple move of selection
                        nextNode.setSelected(true, true);
                    } else {
                        // 1) Extend or shrink multi-selection.
                        if (!nextNode.isSelected()) {
                            nextNode.setSelected(true, false);
                        } else {
                            prevNode.setSelected(false, false);
                        }
                    }
                }
                return nextCellDef;
            case KEY_LEFT:
                if (prevNodeIsParent && prevNode.expanded) prevNode.setExpanded(false);
                return nextCellDef;
            case KEY_RIGHT:
                if (prevNodeIsParent && !prevNode.expanded) prevNode.setExpanded(true);
                return nextCellDef;
            default:
        }
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    onGridReady({api, columnApi}) {
        this.agApi = api;
        this.agColumnApi = columnApi;
    }
}