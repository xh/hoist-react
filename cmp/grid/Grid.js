/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component, isValidElement} from 'react';
import {PropTypes as PT} from 'prop-types';
import {defaults, isString, isNumber, isBoolean, isEqual, xor} from 'lodash';
import {XH} from '@xh/hoist/core';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, frame} from '@xh/hoist/cmp/layout';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import './ag-grid';
import {navigateSelection, agGridReact} from './ag-grid';
import {colChooser} from './ColChooser';

/**
 * Grid Component
 *
 * This is the main view component for a Hoist Grid.  It is a highly managed
 * wrapper around AG Grid, and is the main display component for GridModel.
 *
 * Applications should typically create and manipulate a GridModel for most purposes,
 * including specifying columns and rows, sorting and grouping, and interacting with
 * the selection. Use this class to control the AG Grid UI options and specific
 * behavior of the grid.
 */
@HoistComponent()
class Grid extends Component {

    _scrollOnSelect = true;

    static propTypes = {
        /** Options for AG Grid - See DEFAULT_GRID_OPTIONS for hoist defined defaults */
        agOptions: PT.object
    };

    static DEFAULT_GRID_OPTIONS = {
        toolPanelSuppressSideButtons: true,
        enableSorting: true,
        enableColResize: true,
        deltaRowDataMode: true,
        getRowNodeId: (data) => data.id,
        rowSelection: 'single',
        allowContextMenuWithControlKey: true,
        defaultColDef: {suppressMenu: true},
        groupDefaultExpanded: 1,
        groupUseEntireRow: true,
        popupParent: document.querySelector('body')
    };

    constructor(props) {
        super(props);
        this.agOptions = defaults(
            {...props.agOptions},
            Grid.DEFAULT_GRID_OPTIONS,
            {
                overlayNoRowsTemplate: this.model.emptyText || '<span></span>',
                navigateToNextCell: this.onNavigateToNextCell,
                defaultGroupSortComparator: this.sortByGroup,
                icons: {
                    groupExpanded: convertIconToSvg(
                        Icon.chevronDown(),
                        {classes: ['group-header-icon-expanded']}
                    ),
                    groupContracted: convertIconToSvg(
                        Icon.chevronRight(),
                        {classes: ['group-header-icon-contracted']}
                    )
                }
            }
        );
        this.addAutorun(this.syncSelection);
        this.addAutorun(this.syncSort);
        this.addAutorun(this.syncColumns);
    }

    render() {
        const {store, agColDefs, agExcelStyles, colChooserModel} = this.model;
        return frame(
            div({
                style: {flex: '1 1 auto', overflow: 'hidden'},
                cls: XH.darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                item: agGridReact({
                    rowData: store.records,
                    columnDefs: agColDefs,
                    excelStyles: agExcelStyles,
                    gridOptions: this.agOptions,
                    getContextMenuItems: this.getContextMenuItems,
                    onGridReady: this.onGridReady,
                    onSelectionChanged: this.onSelectionChanged,
                    onSortChanged: this.onSortChanged,
                    onGridSizeChanged: this.onGridSizeChanged,
                    onComponentStateChanged: this.onComponentStateChanged
                })
            }),
            colChooser({
                omit: !colChooserModel,
                model: colChooserModel
            })
        );
    }

    //------------------------
    // Implementation
    //------------------------
    sortByGroup(nodeA, nodeB) {
        if (nodeA.key < nodeB.key) {
            return -1;
        } else if (nodeA.key > nodeB.key) {
            return 1;
        } else {
            return 0;
        }
    }

    syncSelection() {
        const api = this.model.agApi;
        if (!api) return;

        const modelSelection = this.model.selection.ids,
            gridSelection = api.getSelectedRows().map(it => it.id),
            diff = xor(modelSelection, gridSelection);

        // If ag-grid's selection differs from the selection model, set it to match
        if (diff.length > 0) {
            api.deselectAll();
            modelSelection.forEach(id => {
                const node = api.getRowNode(id);
                node.setSelected(true);
                if (this._scrollOnSelect) {
                    api.ensureNodeVisible(node);
                }
            });
        }
    }

    syncSort() {
        const api = this.model.agApi;
        if (!api) return;

        const agSorters = api.getSortModel(),
            modelSorters = this.model.sortBy;
        if (!isEqual(agSorters, modelSorters)) {
            api.setSortModel(modelSorters);
        }
    }

    syncColumns() {
        const api = this.model.agApi;
        if (!api) return;

        api.setColumnDefs(this.model.agColDefs);
    }

    getContextMenuItems = (params) => {

        // TODO: Display this as Blueprint Context menu e.g:
        // ContextMenu.show(contextMenu({menuItems}), {left:0, top:0}, () => {});

        const {store, selection, contextMenuFn} = this.model;
        if (!contextMenuFn) return null;

        const menu = contextMenuFn(params, this.model),
            recId = params.node ? params.node.id : null,
            rec = recId ? store.getById(recId, true) : null,
            selectedIds = selection.ids;

        // Adjust selection to target record -- and sync to grid immediately.
        if (rec && !(recId in selectedIds)) {
            try {
                this._scrollOnSelect = false;
                selection.select(rec, false);
            } finally {
                this._scrollOnSelect = true;
            }
        }
        if (!rec) selection.clear();
        const count = selection.count;

        // Prepare each item
        const items = menu.items;
        items.forEach(it => {
            if (it.prepareFn) it.prepareFn(it, rec, selection);
        });

        return items.filter(it => {
            return !it.hidden;
        }).filter((it, idx, arr) => {
            if (it === '-') {
                // Remove starting / ending separators
                if (idx == 0 || idx == (arr.length - 1)) return false;

                // Remove consecutive separators
                const prev = idx > 0 ? arr[idx - 1] : null;
                if (prev === '-') return false;
            }
            return true;
        }).map(it => {
            if (it === '-') return 'separator';
            if (isString(it)) return it;

            const required = it.recordsRequired,
                requiredRecordsNotMet = (isBoolean(required) && required && count === 0) ||
                                        (isNumber(required) && count !== required);

            let icon = it.icon;
            if (isValidElement(icon)) {
                icon = convertIconToSvg(icon);
            }

            return {
                name: it.text,
                icon,
                disabled: (it.disabled || requiredRecordsNotMet),
                action: () => it.action(it, rec, selection)
            };
        });
    }

    //------------------------
    // Event Handlers
    //------------------------
    onGridReady = (params) => {
        const {api} = params,
            {model} = this;

        model.setAgApi(api);
        api.setSortModel(model.sortBy);
        api.sizeColumnsToFit();
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.model.agApi);
    }

    onSelectionChanged = (ev) => {
        const selection = this.model.selection;
        selection.select(ev.api.getSelectedRows());
    }

    onSortChanged = (ev) => {
        this.model.setSortBy(ev.api.getSortModel());
    }

    onGridSizeChanged = (ev) => {
        ev.api.sizeColumnsToFit();
    }

    onComponentStateChanged = (ev) => {
        ev.api.sizeColumnsToFit();
    }

}
export const grid = elemFactory(Grid);