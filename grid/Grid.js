/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component, isValidElement} from 'react';
import fontawesome from '@fortawesome/fontawesome';
import {hoistComponent, elemFactory} from 'hoist/core';
import {div, frame} from 'hoist/layout';
import {defaults, delay, difference, isString, isNumber, isBoolean, isEqual} from 'lodash';

import './ag-grid';
import {navigateSelection, agGridReact} from './ag-grid';

/**
 * Grid Component
 */
@hoistComponent()
class Grid extends Component {

    static gridDefaultOptions = {
        toolPanelSuppressSideButtons: true,
        enableSorting: true,
        enableColResize: true,
        deltaRowDataMode: true,
        getRowNodeId: (data) => data.id,
        rowSelection: 'single',
        allowContextMenuWithControlKey: true,
        defaultColDef: {suppressMenu: true},
        groupDefaultExpanded: 1,
        groupUseEntireRow: true
    };

    constructor(props) {
        super(props);
        this.gridOptions = defaults(
            props.gridOptions || {},
            Grid.gridDefaultOptions,
            {navigateToNextCell: this.onNavigateToNextCell},
            {defaultGroupSortComparator: this.sortByGroup}
        );
        this.addAutoRun(() => this.syncSelection());
        this.addAutoRun(() => this.syncSort());
        this.addAutoRun(() => this.syncColumns());
    }

    render() {
        const {store, columns} = this.model;
        return frame(
            div({
                style: {flex: '1 1 auto', overflow: 'hidden'},
                cls: this.darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                item: agGridReact({
                    rowData: store.records,
                    columnDefs: columns,
                    onSelectionChanged: this.onSelectionChanged,
                    onGridReady: this.onGridReady,
                    gridOptions: this.gridOptions,
                    getContextMenuItems: this.getContextMenuItems,
                    onGridSizeChanged: this.onGridSizeChanged,
                    onSortChanged: this.onSortChanged
                })
            })
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onGridSizeChanged = (ev) => {
        delay(() => ev.api.sizeColumnsToFit(), 50);
    }

    onGridReady = (params) => {
        this.model.gridApi = params.api;
    }
    
    onSelectionChanged = (ev) => {
        const selection = this.model.selection;
        selection.select(ev.api.getSelectedRows());
    }

    onSortChanged = (ev) => {
        this.model.setSorters(this.toModelSorters(ev.api.getSortModel()));
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.gridOptions.api);
    }

    sortByGroup(nodeA, nodeB) {
        if (nodeA.key < nodeB.key) {
            return -1;
        } else if (nodeA.key > nodeB.key) {
            return 1;
        } else {
            return 0;
        }
    }

    getContextMenuItems = (params) => {

        // TODO: Display this as Blueprint Context menu, with code similar to below?

        // const men = contextMenu({
        //    menuItems: [{
        //        text: 'Reload App',
        //        icon: Icon.refresh(),
        //        action: () => hoistModel.reloadApp()
        //    }, {
        //        text: 'About',
        //        icon: Icon.info(),
        //        action: () => hoistModel.setShowAbout(true)
        //    }]
        // });
        // ContextMenu.show(men, { left:0, top:0}, () => {});


        const menuFn = this.model.contextMenuFn;
        if (!menuFn) return null;

        const menu = menuFn(params),
            recId = params.node ? params.node.id : null,
            rec = recId ? this.model.store.getById(recId, true) : null,
            selection = this.model.selection.ids;

        // If the target record is not in the selection, we need to include it in the count
        let count = selection.length;
        if (rec && !selection.includes(recId)) count++;
        
        return menu.items.map((it) => {
            if (it === '-') return 'separator';
            if (isString(it)) return it;

            const required = it.recordsRequired,
                requiredRecordsNotMet = (isBoolean(required) && required && count === 0) || (isNumber(required) && count !== required);

            // Disable menuitem
            let enabled = true;
            if (it.enableFn) enabled = it.enableFn(it, rec, selection);

            // Prepare menuitem
            if (it.prepareFn) it.prepareFn(it, rec, selection);

            // Convert React FontAwesomeIcon to SVG markup for display in ag-grid's context menu.
            let icon = it.icon;
            if (isValidElement(icon)) {
                const iconDef = fontawesome.findIconDefinition({prefix: 'fas', iconName: icon.props.icon});
                icon = fontawesome.icon(iconDef).html[0];
            }

            return {
                name: it.text,
                icon: icon,
                disabled: (it.disabled || requiredRecordsNotMet || !enabled),
                action: () => {
                    it.action(it, rec, selection);
                }
            };
        });
    }

    syncSelection() {
        const api = this.gridOptions.api,
            modelSelection = this.model.selection.ids,
            gridSelection = api.getSelectedRows().map(it => it.id),
            diff = difference(modelSelection, gridSelection);

        // If ag-grid's selection differs from the selection model, set it to match
        if (diff.length > 0) {
            api.deselectAll();
            modelSelection.forEach(id => {
                const node = api.getRowNode(id);
                node.setSelected(true);
                api.ensureNodeVisible(node);
            });
        }
    }

    syncSort() {
        const api = this.gridOptions.api,
            agSorters = api.getSortModel(),
            modelSorters = this.toAgSorters(this.model.sorters);
        if (!isEqual(agSorters, modelSorters)) {
            api.setSortModel(modelSorters);
        }
    }

    syncColumns() {
        // Needed because AGGridReact won't recognize updates to columns prop.
        this.gridOptions.api.setColumnDefs(this.model.columns);
    }

    toModelSorters(agSorters) {
        return agSorters.map(it => ({field: it.colId, dir: it.sort}));
    }

    toAgSorters(modelSorters) {
        return modelSorters.map(it => ({colId: it.field, sort: it.dir}));
    }
}
export const grid = elemFactory(Grid);