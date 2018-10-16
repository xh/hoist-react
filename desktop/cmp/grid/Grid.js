/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component, isValidElement} from 'react';
import {PropTypes as PT} from 'prop-types';
import {isNil, isString, merge, xor, dropRightWhile, dropWhile, isEmpty} from 'lodash';
import {observable, runInAction} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {box, fragment} from '@xh/hoist/cmp/layout';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import './ag-grid';
import {agGridReact, navigateSelection, ColumnHeader} from './ag-grid';
import {colChooser} from './ColChooser';

/**
 * The primary rich data grid component within the Hoist desktop toolkit.
 * It is a highly managed wrapper around ag-Grid and is the main display component for GridModel.
 *
 * Applications should typically configure and interact with Grids via a GridModel, which provides
 * support for specifying the Grid's data Store, Column definitions, sorting and grouping state,
 * selection API, and more.
 *
 * Use this Component's props to control the ag-Grid-specific UI options and handlers.
 * @see {@link https://www.ag-grid.com/javascript-grid-reference-overview/|ag-Grid Docs}
 * @see GridModel
 */
@HoistComponent
@LayoutSupport
export class Grid extends Component {

    static propTypes = {
        /**
         * Options for ag-Grid's API.
         *
         * This constitutes an 'escape hatch' for applications that need to get to the underlying
         * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
         * interfere with the implementation of this component and its use of the ag-Grid API.
         */
        agOptions: PT.object,

        /**
         * Callback to call when a row is double clicked.  Function will receive an event
         * with a data node containing the row's data.
         */
        onRowDoubleClicked: PT.func,

        /**
         * Callback to call when a key down event is detected on this component.
         * Function will receive an event with the standard 'target' element.
         *
         * Note that the ag-Grid API provides limited ability to customize keyboard handling.
         * This handler is designed to allow application to workaround this.
         */
        onKeyDown: PT.func,

        /**
         * Show a colored row background on hover. Defaults to false.
         */
        showHover: PT.bool
    };

    static ROW_HEIGHT = 28;
    static COMPACT_ROW_HEIGHT = 24;

    // Observable stamp incremented every time the ag-Grid receives a new set of data.
    // Used to ensure proper re-running / sequencing of data and selection reactions.
    @observable _dataVersion = 0;

    baseClassName = 'xh-grid';

    constructor(props) {
        super(props);
        this.addReaction(this.selectionReaction());
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.dataReaction());
        this.addReaction(this.compactReaction());
    }

    render() {
        const {colChooserModel, compact} = this.model,
            {agOptions, showHover, onKeyDown} = this.props,
            layoutProps = this.getLayoutProps();

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 'auto';
        }

        // Note that we intentionally do *not* render the agGridReact element below with either the data
        // or the columns. These two bits are the most volatile in our GridModel, and this causes
        // extra re-rendering and jumpiness.  Instead, we rely on the API methods to keep these in sync.
        return fragment(
            box({
                ...layoutProps,
                item: agGridReact(merge(this.createDefaultAgOptions(), agOptions)),
                className: this.getClassName(
                    'ag-grid-holder',
                    XH.darkTheme ? 'ag-theme-balham-dark' : 'ag-theme-balham',
                    compact ? 'xh-grid-compact' : 'xh-grid-standard',
                    showHover ? 'xh-grid-show-hover' : ''
                ),
                onKeyDown
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

        let ret = {
            toolPanelSuppressSideButtons: true,
            enableSorting: true,
            enableColResize: true,
            deltaRowDataMode: true,
            getRowNodeId: (data) => data.id,
            allowContextMenuWithControlKey: true,
            defaultColDef: {suppressMenu: true, menuTabs: ['filterMenuTab']},
            popupParent: document.querySelector('body'),
            navigateToNextCell: this.onNavigateToNextCell,
            defaultGroupSortComparator: this.sortByGroup,
            icons: {
                groupExpanded: convertIconToSvg(
                    Icon.angleDown(),
                    {classes: ['group-header-icon-expanded', 'fa-fw']}
                ),
                groupContracted: convertIconToSvg(
                    Icon.angleRight(),
                    {classes: ['group-header-icon-contracted', 'fa-fw']}
                )
            },
            frameworkComponents: {agColumnHeader: ColumnHeader},
            rowSelection: model.selModel.mode,
            rowDeselection: true,
            getRowHeight: () => model.compact ? Grid.COMPACT_ROW_HEIGHT : Grid.ROW_HEIGHT,
            getRowClass: ({data}) => model.rowClassFn ? model.rowClassFn(data) : null,
            overlayNoRowsTemplate: model.emptyText || '<span></span>',
            getContextMenuItems: this.getContextMenuItems,
            onRowDoubleClicked: props.onRowDoubleClicked,
            onGridReady: this.onGridReady,
            onSelectionChanged: this.onSelectionChanged,
            onGridSizeChanged: this.onGridSizeChanged,
            onDragStopped: this.onDragStopped,
            onColumnResized: this.onColumnResized,

            groupDefaultExpanded: 1,
            groupUseEntireRow: true
        };

        if (model.treeMode) {
            ret = {
                ...ret,
                groupDefaultExpanded: 0,
                groupSuppressAutoColumn: true,
                treeData: true,
                getDataPath: this.getDataPath
            };
        }
        return ret;
    }

    //------------------------
    // Support for defaults
    //------------------------
    getColumnDefs() {
        return this.model.columns.map(col => col.getAgSpec());
    }

    getContextMenuItems = (params) => {
        const {store, selModel, contextMenuFn} = this.model;
        if (!contextMenuFn) return null;

        const menu = contextMenuFn(params, this.model),
            recId = params.node ? params.node.id : null,
            record = isNil(recId) ? null : store.getById(recId, true),
            selectedIds = selModel.ids;

        // Adjust selection to target record -- and sync to grid immediately.
        if (record && !(selectedIds.includes(recId))) {
            selModel.select(record);
        }

        if (!record) selModel.clear();

        return this.buildMenuItems(menu.items, record, selModel.records);
    };

    buildMenuItems(recordActions, record, selectedRecords) {
        let items = [];
        recordActions.forEach(action => {
            if (action === '-') {
                items.push('separator');
                return;
            }

            if (isString(action)) {
                items.push(action);
                return;
            }

            const params = {
                record,
                selectedRecords,
                gridModel: this.model
            };

            const displaySpec = action.getDisplaySpec(params);
            if (displaySpec.hidden) return;

            let subMenu;
            if (!isEmpty(displaySpec.items)) {
                subMenu = this.buildMenuItems(displaySpec.items, record, selectedRecords);
            }

            let icon = displaySpec.icon;
            if (isValidElement(icon)) {
                icon = convertIconToSvg(icon);
            }

            items.push({
                name: displaySpec.text,
                icon,
                subMenu,
                tooltip: displaySpec.tooltip,
                disabled: displaySpec.disabled,
                action: () => action.call(params)
            });
        });

        items = dropRightWhile(items, it => it === 'separator');
        items = dropWhile(items, it => it === 'separator');
        return items;
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
    dataReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.store.records, model.store.dataLastUpdated],
            run: ([api, records]) => {
                if (api) {
                    runInAction(() => {
                        // Load updated data into the grid.
                        api.setRowData(records);

                        // Size columns to account for scrollbar show/hide due to row count change.
                        api.sizeColumnsToFit();

                        // Force grid to fully re-render cells. We are *not* relying on its default
                        // cell-level change detection as this does not account for our current
                        // renderer API (where renderers can reference other properties on the data
                        // object). See https://github.com/exhi/hoist-react/issues/550.
                        api.refreshCells({force: true});

                        // Increment version counter to trigger selectionReaction w/latest data.
                        this._dataVersion++;
                    });
                }
            }
        };
    }

    selectionReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.selection, this._dataVersion],
            run: ([api]) => {             
                if (!api) return;

                const modelSelection = model.selModel.ids,
                    gridSelection = api.getSelectedRows().map(it => it.id),
                    diff = xor(modelSelection, gridSelection);

                // If ag-grid's selection differs from the selection model, set it to match.
                if (diff.length > 0) {
                    api.deselectAll();
                    modelSelection.forEach(id => {
                        const node = api.getRowNode(id);
                        if (node) node.setSelected(true);
                    });
                }
            }
        };
    }

    sortReaction() {
        return {
            track: () => [this.model.agApi, this.model.sortBy],
            run: ([api, sortBy]) => {
                if (api) api.setSortModel(sortBy);
            }
        };
    }

    columnsReaction() {
        return {
            track: () => [this.model.agApi, this.model.columns, this.model.sortBy],
            run: ([api]) => {
                if (api) {
                    // ag-grid loses expand state and column filter state
                    // when columns are re-defined.
                    const expandState = this.readExpandState(api),
                        filterState = this.readFilterState(api);

                    api.setColumnDefs(this.getColumnDefs());
                    this.writeExpandState(api, expandState);
                    this.writeFilterState(api, filterState);
                    api.sizeColumnsToFit();
                }
            }
        };
    }

    compactReaction() {
        return {
            track: () => [this.model.agApi, this.model.compact],
            run: ([api]) => {
                if (api) api.resetRowHeights();
            }
        };
    }

    //------------------------
    // Event Handlers on AG Grid.
    //------------------------
    getDataPath = (data) => {
        return data.xhTreePath;
    };

    onGridReady = (ev) => {
        this.model.setAgApi(ev.api);
        this.model.setAgColumnApi(ev.columnApi);
    };

    onNavigateToNextCell = (params) => {
        return navigateSelection(params, this.model.agApi);
    };

    onSelectionChanged = (ev) => {
        this.model.selModel.select(ev.api.getSelectedRows());
    };

    // Catches column re-ordering AND resizing via user drag-and-drop interaction.
    onDragStopped = (ev) => {
        this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
    };

    // Catches column resizing on call to autoSize API.
    onColumnResized = (ev) => {
        if (this.isDisplayed && ev.finished && ev.source == 'autosizeColumns') {
            this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
        }
    };

    onGridSizeChanged = (ev) => {
        if (this.isDisplayed) {
            ev.api.sizeColumnsToFit();
        }
    };

    readExpandState(api) {
        const ret = [];
        api.forEachNode(node => ret.push(node.expanded));
        return ret;
    }

    writeExpandState(api, expandState) {
        let wasChanged = false,
            i = 0;
        api.forEachNode(node => {
            const state = expandState[i++];
            if (node.expanded !== state) {
                node.expanded = state;
                wasChanged = true;
            }
        });
        if (wasChanged) {
            api.onGroupExpandedOrCollapsed();
        }
    }

    readFilterState(api) {
        return api.getFilterModel();
    }

    writeFilterState(api, filterState) {
        api.setFilterModel(filterState);
    }

}

export const grid = elemFactory(Grid);
