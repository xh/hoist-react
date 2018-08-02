/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component, isValidElement} from 'react';
import {PropTypes as PT} from 'prop-types';
import {find, isBoolean, isEqual, isNil, isNumber, isString, merge, xor} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {box, fragment} from '@xh/hoist/cmp/layout';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import './ag-grid';
import {agGridReact, navigateSelection} from './ag-grid';
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
@LayoutSupport
class Grid extends Component {

    _scrollOnSelect = true;

    static propTypes = {

        /**
         * Options for AG Grid's API.
         *
         * This constitutes an 'escape hatch' for applications that need to get to the
         * underlying AG Grid API.  It should be used with care and at the application
         * developers risk.  Settings made here may interfere with the operation of this
         * component and its use of the AG Grid API.
         */
        agOptions: PT.object,

        /**
         * Callback to call when a row is double clicked.  Function will receive an event
         * with a data node containing the row's data.
         */
        onRowDoubleClicked: PT.func
    };

    baseCls = 'xh-grid';

    constructor(props) {
        super(props);
        this.addReaction(this.selectionReaction());
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.dataReaction());
    }

    render() {
        const {colChooserModel} = this.model,
            {layoutConfig, agOptions} = this.props;

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutConfig.width == null && layoutConfig.height == null && layoutConfig.flex == null) {
            layoutConfig.flex = 'auto';
        }

        // Note that we intentionally do *not* render the agGridReact element below with either the data
        // or the columns. These two bits are the most volatile in our GridModel, and this causes
        // extra re-rendering and jumpiness.  Instead, we rely on the API methods to keep these in sync.
        return fragment(
            box({
                layoutConfig: layoutConfig,
                cls: this.getClassNames('ag-grid-holder', XH.darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham'),
                item: agGridReact(merge(this.createDefaultAgOptions(), agOptions))
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
    createDefaultAgOptions() {
        const {model, props} = this;

        return {
            toolPanelSuppressSideButtons: true,
            enableSorting: true,
            enableColResize: true,
            deltaRowDataMode: true,
            getRowNodeId: (data) => data.id,
            allowContextMenuWithControlKey: true,
            defaultColDef: {suppressMenu: true},
            groupDefaultExpanded: 1,
            groupUseEntireRow: true,
            popupParent: document.querySelector('body'),
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
            },
            rowSelection: model.selModel.mode,
            rowDeselection: true,
            overlayNoRowsTemplate: model.emptyText || '<span></span>',
            getContextMenuItems: this.getContextMenuItems,
            onRowDoubleClicked: props.onRowDoubleClicked,
            onGridReady: this.onGridReady,
            onSelectionChanged: this.onSelectionChanged,
            onSortChanged: this.onSortChanged,
            onGridSizeChanged: this.onGridSizeChanged,
            onDragStopped: this.onDragStopped,
            onRowDataUpdated: this.onRowDataUpdated
        };
    }

    //------------------------
    // Support for defaults
    //------------------------
    getColumnDefs() {
        const {columns, sortBy} = this.model;
        const cols = columns.map(col => {
            return col.agColDef ? col.agColDef() : col;
        });

        let now = Date.now();
        sortBy.forEach(it => {
            const col = find(cols, {colId: it.colId});
            if (col) {
                col.sort = it.sort;
                col.sortedAt = now++;
            }
        });
        return cols;
    }

    getContextMenuItems = (params) => {
        // TODO: Display this as Blueprint Context menu e.g:
        // ContextMenu.show(contextMenu({menuItems}), {left:0, top:0}, () => {});

        const {store, selModel, contextMenuFn} = this.model;
        if (!contextMenuFn) return null;

        const menu = contextMenuFn(params, this.model),
            recId = params.node ? params.node.id : null,
            rec = isNil(recId) ? null : store.getById(recId, true),
            selectedIds = selModel.ids;

        // Adjust selection to target record -- and sync to grid immediately.
        if (rec && !(selectedIds.includes(recId))) {
            try {
                this._scrollOnSelect = false;
                selModel.select(rec);
            } finally {
                this._scrollOnSelect = true;
            }
        }
        if (!rec) selModel.clear();
        const {count} = selModel;

        // Prepare each item
        const items = menu.items;
        items.forEach(it => {
            if (it.prepareFn) it.prepareFn(it, rec, selModel);
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
                action: () => it.action(it, rec, selModel)
            };
        });
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

    //------------------------
    // Reactions to model
    //------------------------
    selectionReaction() {
        const {model} = this;

        return {
            track: () => [model.selection, model.agApi, model.agNodesRendered],
            run: () => {
                const {agApi, agNodesRendered, selModel} = model;
                if (!agApi || !agNodesRendered) return;

                const modelSelection = selModel.ids,
                    gridSelection = agApi.getSelectedRows().map(it => it.id),
                    diff = xor(modelSelection, gridSelection);

                // If ag-grid's selection differs from the selection model, set it to match
                if (diff.length > 0) {
                    agApi.deselectAll();
                    modelSelection.forEach(id => {
                        const node = agApi.getRowNode(id);
                        node.setSelected(true);
                        if (this._scrollOnSelect) {
                            agApi.ensureNodeVisible(node);
                        }
                    });
                }
            }
        };
    }

    sortReaction() {
        const {model} = this;
        return {
            track: () => [model.sortBy, model.agApi],
            run: () => {
                const {agApi, sortBy} = model;
                if (agApi && !isEqual(agApi.getSortModel(), sortBy)) {
                    agApi.setSortModel(sortBy);
                }
            }
        };
    }

    columnsReaction() {
        const {model} = this;
        return {
            track: () => [model.columns, model.agApi],
            run: () => {
                const {agApi} = model;
                if (agApi) {
                    agApi.setColumnDefs(this.getColumnDefs());
                    agApi.sizeColumnsToFit();
                }
            }
        };
    }

    dataReaction() {
        const {model} = this;
        return {
            track: () => [model.store.records, model.agApi],
            run: () => {
                const {agApi} = model;
                if (agApi) {
                    model.setAgNodesRendered(false);
                    agApi.setRowData(model.store.records);
                }
            }
        };
    }

    //------------------------
    // Event Handlers on AG Grid.
    //------------------------
    onGridReady = (params) => {
        this.model.setAgApi(params.api);
    }

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.model.agApi);
    }

    onSelectionChanged = (ev) => {
        if (!this.model.agNodesRendered) return;
        this.model.selModel.select(ev.api.getSelectedRows());
    }

    onSortChanged = (ev) => {
        this.model.setSortBy(ev.api.getSortModel());
    }

    onDragStopped = (ev) => {
        const gridColumns = ev.api.columnController.gridColumns;
        this.model.syncColumnOrder(gridColumns);
    }

    onGridSizeChanged = (ev) => {
        if (this.isDisplayed) {
            ev.api.sizeColumnsToFit();
        }
    }

    onRowDataUpdated = () => {
        this.model.setAgNodesRendered(true);
    }

}
export const grid = elemFactory(Grid);
