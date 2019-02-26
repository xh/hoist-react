/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component, isValidElement} from 'react';
import PT from 'prop-types';
import {isNil, isString, merge, xor, dropRightWhile, dropWhile, isEmpty, last, isEqual, map, isFinite} from 'lodash';
import {observable, computed, runInAction} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {box, fragment} from '@xh/hoist/cmp/layout';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import './ag-grid';
import {agGridReact, navigateSelection, ColumnHeader} from './ag-grid';
import {GridModel} from './GridModel';

import {colChooser as desktopColChooser, StoreContextMenu} from '@xh/hoist/dynamics/desktop';
import {colChooser as mobileColChooser} from '@xh/hoist/dynamics/mobile';

/**
 * The primary rich data grid component within the Hoist toolkit.
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

    static modelClass = GridModel;

    static propTypes = {
        /**
         * Options for ag-Grid's API.
         *
         * This constitutes an 'escape hatch' for applications that need to get to the underlying
         * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
         * interfere with the implementation of this component and its use of the ag-Grid API.
         */
        agOptions: PT.object,

        /** True to suppress display of the grid's header row. */
        hideHeaders: PT.bool,

        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(GridModel), PT.object]).isRequired,

        /**
         * Callback to call when a key down event is detected on this component.
         * Function will receive an event with the standard 'target' element.
         *
         * Note that the ag-Grid API provides limited ability to customize keyboard handling.
         * This handler is designed to allow application to workaround this.
         */
        onKeyDown: PT.func,

        /**
         * Callback to call when a row is clicked. Function will receive an event
         * with a data node containing the row's data.
         */
        onRowClicked: PT.func,

        /**
         * Callback to call when a row is double clicked. Function will receive an event
         * with a data node containing the row's data.
         */
        onRowDoubleClicked: PT.func,

        /**
         * Callback to call when a cell is clicked. Function will receive an event
         * with a data node, cell value, and column.
         */
        onCellClicked: PT.func,

        /**
         * Callback to call when a cell is double clicked. Function will receive an event
         * with a data node, cell value, and column.
         */
        onCellDoubleClicked: PT.func,

        /**
         * Show a colored row background on hover. Defaults to false.
         */
        showHover: PT.bool
    };

    static ROW_HEIGHT = 28;
    static COMPACT_ROW_HEIGHT = 24;
    static MULTIFIELD_ROW_HEIGHT = 38;

    // The minimum required row height specified by the columns (if any) */
    @computed
    get rowHeight() {
        const modelHeight = this.model.compact ? Grid.COMPACT_ROW_HEIGHT : Grid.ROW_HEIGHT,
            columnHeight = Math.max(...map(this.model.columns, 'rowHeight').filter(isFinite));
        return isFinite(columnHeight) ? Math.max(modelHeight, columnHeight) : modelHeight;
    }

    // Observable stamp incremented every time the ag-Grid receives a new set of data.
    // Used to ensure proper re-running / sequencing of data and selection reactions.
    @observable _dataVersion = 0;

    // Do any root level records have children?
    @observable _isHierarchical = false;

    baseClassName = 'xh-grid';

    constructor(props) {
        super(props);
        this.addReaction(this.selectionReaction());
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.columnStateReaction());
        this.addReaction(this.dataReaction());
        this.addReaction(this.compactReaction());
        this.addReaction(this.groupReaction());
    }

    render() {
        const {compact, treeMode} = this.model,
            {agOptions, showHover, onKeyDown} = this.props,
            {isMobile} = XH,
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
                    treeMode && this._isHierarchical ? 'xh-grid-hierarchical' : '',
                    !isMobile && showHover ? 'xh-grid-show-hover' : ''
                ),
                onKeyDown: !isMobile ? onKeyDown : null
            }),
            this.renderColChooser()
        );
    }

    renderColChooser() {
        const {colChooserModel} = this.model,
            cmp = XH.isMobile ? mobileColChooser : desktopColChooser;
        return colChooserModel ? cmp({model: colChooserModel}) : null;
    }

    //------------------------
    // Implementation
    //------------------------
    createDefaultAgOptions() {
        const {model, props} = this;

        let ret = {
            deltaRowDataMode: true,
            getRowNodeId: (data) => data.id,
            defaultColDef: {
                sortable: true,
                resizable: true,
                suppressMenu: true,
                menuTabs: ['filterMenuTab']
            },
            popupParent: document.querySelector('body'),
            defaultGroupSortComparator: this.sortByGroup,
            headerHeight: props.hideHeaders ? 0 : undefined,
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
            getRowHeight: () => this.rowHeight,
            getRowClass: ({data}) => model.rowClassFn ? model.rowClassFn(data) : null,
            overlayNoRowsTemplate: model.emptyText || '<span></span>',
            onRowClicked: props.onRowClicked,
            onRowDoubleClicked: props.onRowDoubleClicked,
            onCellClicked: props.onCellClicked,
            onCellDoubleClicked: props.onCellDoubleClicked,
            onRowGroupOpened: this.onRowGroupOpened,
            onGridReady: this.onGridReady,
            onSelectionChanged: this.onSelectionChanged,
            onGridSizeChanged: this.onGridSizeChanged,
            onDragStopped: this.onDragStopped,
            onColumnResized: this.onColumnResized,
            onColumnRowGroupChanged: this.onColumnRowGroupChanged,
            onColumnVisible: this.onColumnVisible,
            processCellForClipboard: this.processCellForClipboard,
            groupDefaultExpanded: 1,
            groupUseEntireRow: true,
            autoGroupColumnDef: {
                suppressSizeToFit: true // Without this the auto group col will get shrunk when we size to fit
            }
        };

        // Platform specific defaults
        if (XH.isMobile) {
            ret = {
                ...ret,
                allowContextMenuWithControlKey: false,
                scrollbarWidth: 0
            };
        } else {
            ret = {
                ...ret,
                allowContextMenuWithControlKey: true,
                getContextMenuItems: this.getContextMenuItems,
                navigateToNextCell: this.onNavigateToNextCell
            };
        }

        // Tree grid defaults
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
                if (last(items) !== 'separator') items.push('separator');
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

            let childItems;
            if (!isEmpty(displaySpec.items)) {
                const menu = new StoreContextMenu({items: displaySpec.items, gridModel: this.gridModel});
                childItems = this.buildMenuItems(menu.items, record, selectedRecords);
            }

            let icon = displaySpec.icon;
            if (isValidElement(icon)) {
                icon = convertIconToSvg(icon);
            }

            items.push({
                name: displaySpec.text,
                icon,
                subMenu: childItems,
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

                        // Set flag if data is hierarchical.
                        this._isHierarchical = model.store.allRecords.some(
                            rec => !!rec.children.length
                        );

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

    groupReaction() {
        return {
            track: () => [this.model.agColumnApi, this.model.groupBy],
            run: ([colApi, groupBy]) => {
                if (colApi) colApi.setRowGroupColumns(groupBy);
            }
        };
    }

    columnsReaction() {
        return {
            track: () => [this.model.agApi, this.model.columns],
            run: ([api]) => {
                if (api) {
                    this.doWithPreservedState({expansion: true, filters: true}, () => {
                        api.setColumnDefs(this.getColumnDefs());
                    });
                    api.sizeColumnsToFit();
                }
            }
        };
    }

    columnStateReaction() {
        return {
            track: () => [this.model.agApi, this.model.agColumnApi, this.model.columnState],
            run: ([api, colApi, colState]) => {
                if (!colApi || !api) return;

                const agColState = colApi.getColumnState();

                // 0) Insert the auto group col state if it exists, since we won't have it in our column state list
                const autoColState = agColState.find(c => c.colId === 'ag-Grid-AutoColumn');
                if (autoColState) {
                    colState.splice(agColState.indexOf(autoColState), 0, autoColState);
                }

                // 1) Columns all in right place -- simply update incorrect props we maintain
                if (isEqual(colState.map(c => c.colId), agColState.map(c => c.colId))) {
                    let hadChanges = false;
                    colState.forEach((col, index) => {
                        const agCol = agColState[index],
                            id = col.colId;
                        if (agCol.width != col.width) {
                            colApi.setColumnWidth(id, col.width);
                            hadChanges = true;
                        }
                        if (agCol.hide != col.hidden) {
                            colApi.setColumnVisible(id, !col.hidden);
                            hadChanges = true;
                        }
                    });
                    if (hadChanges) api.sizeColumnsToFit();
                    return;
                }

                // 2) Otherwise do an (expensive) full refresh of column state
                // Merge our state onto the ag column state to get any state which we do not yet support
                colState = colState.map(({colId, width, hidden}) => {
                    const agCol = agColState.find(c => c.colId === colId) || {};
                    return {
                        colId,
                        ...agCol,
                        width,
                        hide: hidden
                    };
                });

                this.doWithPreservedState({expansion: true}, () => {
                    colApi.setColumnState(colState);
                });
                api.sizeColumnsToFit();
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

    // Catches row group changes triggered from ag-grid ui components
    onColumnRowGroupChanged = (ev) => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.setGroupBy(ev.columnApi.getRowGroupColumns().map(it => it.colId));
        }
    };

    onRowGroupOpened = () => {
        this.model.agApi.sizeColumnsToFit();
    };

    // Catches column visibility changes triggered from ag-grid ui components
    onColumnVisible = (ev) => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
        }
    };

    onGridSizeChanged = (ev) => {
        if (this.isDisplayed) {
            ev.api.sizeColumnsToFit();
        }
    };

    doWithPreservedState({expansion, filters}, fn) {
        const expandState = expansion ? this.readExpandState() : null,
            filterState = filters ? this.readFilterState() : null;
        fn();
        if (expandState) this.writeExpandState(expandState);
        if (filterState) this.writeFilterState(filterState);
    }

    readExpandState() {
        const ret = [];
        this.model.agApi.forEachNode(node => ret.push(node.expanded));
        return ret;
    }

    writeExpandState(expandState) {
        const api = this.model.agApi;
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

    readFilterState() {
        return this.model.agApi.getFilterModel();
    }

    writeFilterState(filterState) {
        this.model.agApi.setFilterModel(filterState);
    }

    // Underlying value for treeColumns is actually the record ID due to getDataPath() impl.
    // Special handling here, similar to that in Column class, to extract the desired value.
    processCellForClipboard({value, node, column}) {
        return column.isTreeColumn ? node.data[column.field] : value;
    }
}
export const grid = elemFactory(Grid);