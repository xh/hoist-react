/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component, isValidElement} from 'react';
import PT from 'prop-types';
import {
    isNil,
    isString,
    merge,
    xor,
    dropRightWhile,
    dropWhile,
    isEmpty,
    last,
    isEqual,
    map,
    isFinite
} from 'lodash';
import {observable, computed, runInAction} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {fragment, hframe} from '@xh/hoist/cmp/layout';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import {agGrid, AgGrid} from '@xh/hoist/cmp/ag-grid';
import {ColumnHeader} from './impl/ColumnHeader';
import {GridModel} from './GridModel';
import {withShortDebug} from '@xh/hoist/utils/js';

import {colChooser as desktopColChooser, StoreContextMenu} from '@xh/hoist/dynamics/desktop';
import {colChooser as mobileColChooser} from '@xh/hoist/dynamics/mobile';

import './Grid.scss';

/**
 * The primary rich data grid component within the Hoist toolkit.
 * It is a highly managed wrapper around ag-Grid and is the main display component for GridModel.
 *
 * Applications should typically configure and interact with Grids via a GridModel, which provides
 * support for specifying the Grid's data Store, Column definitions, sorting and grouping state,
 * selection API, and more.
 *
 * For advanced ag-Grid use-cases that are not well supported by this component, note that the
 * {@see AgGrid} Hoist component provides much thinner and less opinionated wrapper around ag-Grid
 * while still retaining consistent styling and some additional conveniences. However a number of
 * core Hoist integrations and features will *not* be available with that thinner wrapper.
 *
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
         *
         * Note that changes to these options after the initial render of this component will be ignored.
         */
        agOptions: PT.object,

        /** True to suppress display of the grid's header row. */
        hideHeaders: PT.bool,

        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(GridModel), PT.object]).isRequired,

        /**
         * Callback when the grid has initialized. The component will call this with the ag-Grid
         * event after running its internal handler to associate the ag-Grid APIs with its model.
         */
        onGridReady: PT.func,

        /**
         * Callback when a key down event is detected on this component. Function will receive an
         * event with the standard 'target' element.
         *
         * Note that the ag-Grid API provides limited ability to customize keyboard handling.
         * This handler is designed to allow application to workaround this.
         */
        onKeyDown: PT.func,

        /**
         * Callback when a row is clicked. Function will receive an event with a data node
         * containing the row's data. (Note that this may be null - e.g. for clicks on group rows.)
         */
        onRowClicked: PT.func,

        /**
         * Callback when a row is double clicked. Function will receive an event with a data node
         * containing the row's data. (Note that this may be null - e.g. for clicks on group rows.)
         */
        onRowDoubleClicked: PT.func,

        /**
         * Callback when a cell is clicked. Function will receive an event with a data node, cell
         * value, and column.
         */
        onCellClicked: PT.func,

        /**
         * Callback when a cell is double clicked. Function will receive an event with a data node,
         * cell value, and column.
         */
        onCellDoubleClicked: PT.func
    };

    static MULTIFIELD_ROW_HEIGHT = 38;

    // The minimum required row height specified by the columns (if any) */
    @computed
    get rowHeight() {
        const modelHeight = this.model.compact ? AgGrid.COMPACT_ROW_HEIGHT : AgGrid.ROW_HEIGHT,
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
        this.addReaction(this.groupReaction());

        this.agOptions = merge(this.createDefaultAgOptions(), props.agOptions || {});
    }

    render() {
        const {model, props, agOptions} = this,
            {treeMode, agGridModel} = model,
            {onKeyDown} = props;

        // Note that we intentionally do *not* render the agGridReact element below with either the data
        // or the columns. These two bits are the most volatile in our GridModel, and this causes
        // extra re-rendering and jumpiness.  Instead, we rely on the API methods to keep these in sync.
        return fragment(
            hframe({
                className: this.getClassName(
                    treeMode && this._isHierarchical ? 'xh-grid--hierarchical' : 'xh-grid--flat'
                ),
                item: agGrid({
                    model: agGridModel,
                    ...this.getLayoutProps(),
                    ...agOptions
                }),
                onKeyDown
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
            onSelectionChanged: this.onSelectionChanged,
            onGridSizeChanged: this.onGridSizeChanged,
            onDragStopped: this.onDragStopped,
            onColumnResized: this.onColumnResized,
            onColumnRowGroupChanged: this.onColumnRowGroupChanged,
            onColumnVisible: this.onColumnVisible,
            processCellForClipboard: this.processCellForClipboard,
            defaultGroupSortComparator: this.groupSortComparator,
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
                suppressContextMenu: true,
                allowContextMenuWithControlKey: false,
                scrollbarWidth: 0
            };
        } else {
            ret = {
                ...ret,
                allowContextMenuWithControlKey: true,
                getContextMenuItems: this.getContextMenuItems
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

    //------------------------
    // Reactions to model
    //------------------------
    dataReaction() {
        const {model} = this,
            {agGridModel, store} = model;

        return {
            track: () => [agGridModel.agApi, store.records, store.lastUpdated],
            run: ([api, records]) => {
                if (!api) return;

                runInAction(() => {
                    withShortDebug(`Loaded ${records.length} records into ag-Grid`, () => {
                        // Workaround for AG-2879.
                        this.clearDataIfExpensiveDeletionPending(records, api);

                        // Load updated data into the grid.
                        api.setRowData(records);

                        // Size columns to account for scrollbar show/hide due to row count change.
                        api.sizeColumnsToFit();

                        // Force grid to fully re-render cells. We are *not* relying on its default
                        // cell-level change detection as this does not account for our current
                        // renderer API (where renderers can reference other properties on the data
                        // object). See https://github.com/exhi/hoist-react/issues/550.
                        api.refreshCells({force: true});
                    }, this);

                    // Set flag if data is hierarchical.
                    this._isHierarchical = store.allRootCount != store.allCount;
                  
                    // Increment version counter to trigger selectionReaction w/latest data.
                    this._dataVersion++;
                });
            }
        };
    }

    selectionReaction() {
        const {model} = this,
            {agGridModel} = model;

        return {
            track: () => [agGridModel.agApi, model.selection, this._dataVersion],
            run: ([api]) => {
                if (!api) return;

                const modelSelection = model.selModel.ids,
                    selectedIds = agGridModel.getSelectedRowNodeIds(),
                    diff = xor(modelSelection, selectedIds);

                // If ag-grid's selection differs from the selection model, set it to match.
                if (diff.length > 0) {
                    agGridModel.setSelectedRowNodeIds(modelSelection);
                }
            }
        };
    }

    sortReaction() {
        const {agGridModel} = this.model;
        return {
            track: () => [agGridModel.agApi, this.model.sortBy],
            run: ([api, sortBy]) => {
                if (api) api.setSortModel(sortBy);
            }
        };
    }

    groupReaction() {
        const {agGridModel} = this.model;
        return {
            track: () => [agGridModel.agColumnApi, this.model.groupBy],
            run: ([colApi, groupBy]) => {
                if (colApi) colApi.setRowGroupColumns(groupBy);
            }
        };
    }

    columnsReaction() {
        const {agGridModel} = this.model;
        return {
            track: () => [agGridModel.agApi, this.model.columns],
            run: ([api]) => {
                if (!api) return;

                this.doWithPreservedState({expansion: true, filters: true}, () => {
                    api.setColumnDefs(this.getColumnDefs());
                });
                api.sizeColumnsToFit();
            }
        };
    }

    columnStateReaction() {
        const {agGridModel} = this.model;
        return {
            track: () => [agGridModel.agApi, agGridModel.agColumnApi, this.model.columnState],
            run: ([api, colApi, colState]) => {
                if (!api || !colApi) return;

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

    //  Workaround for n^2 deletion behavior in ag-Grid (AG-2879)
    clearDataIfExpensiveDeletionPending(newRecords, api) {
        let currCount = 0, deleteCount = 0, addCount = 0;

        const ids = new Set();
        api.forEachNode((node, index) => ids.add(node.id));
        currCount = ids.size;

        newRecords.forEach(rec => {
            if (!ids.delete(rec.id)) addCount++;
        });
        deleteCount = ids.size;

        // Heuristic -- we think slow deletions grow by order (D * (C + A))
        if (deleteCount > 1 && (deleteCount * (currCount + addCount)) > 10000000) {
            console.debug(`Expensive deletion detected! Deletes: ${deleteCount} | Curr + Adds: ${currCount + addCount}`);
            withShortDebug(`Pre-Cleared ${currCount} records from ag-Grid`, () => {
                api.selectionController.reset();
                api.clientSideRowModel.setRowData([]);
            }, this);
        }
    }

    //------------------------
    // Event Handlers on AG Grid.
    //------------------------
    getDataPath = (data) => {
        return data.xhTreePath;
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
        this.model.agGridModel.agApi.sizeColumnsToFit();
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

    groupSortComparator = (nodeA, nodeB) => {
        const gridModel = this.model;
        return gridModel.groupSortFn(nodeA.key, nodeB.key, nodeA.field, {gridModel, nodeA, nodeB});
    };

    doWithPreservedState({expansion, filters}, fn) {
        const {agGridModel} = this.model,
            expandState = expansion ? agGridModel.getExpandState() : null,
            filterState = filters ? this.readFilterState() : null;
        fn();
        if (expandState) agGridModel.setExpandState(expandState);
        if (filterState) this.writeFilterState(filterState);
    }

    readFilterState() {
        return this.model.agGridModel.agApi.getFilterModel();
    }

    writeFilterState(filterState) {
        this.model.agGridModel.agApi.setFilterModel(filterState);
    }

    // Underlying value for treeColumns is actually the record ID due to getDataPath() impl.
    // Special handling here, similar to that in Column class, to extract the desired value.
    processCellForClipboard({value, node, column}) {
        return column.isTreeColumn ? node.data[column.field] : value;
    }

}

export const grid = elemFactory(Grid);