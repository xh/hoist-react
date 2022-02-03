/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {agGrid, AgGrid} from '@xh/hoist/cmp/ag-grid';
import {getTreeStyleClasses, GridAutosizeMode} from '@xh/hoist/cmp/grid';
import {div, fragment, frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, XH} from '@xh/hoist/core';
import {
    colChooser as desktopColChooser,
    gridFilterDialog,
    StoreContextMenu
} from '@xh/hoist/dynamics/desktop';
import {colChooser as mobileColChooser} from '@xh/hoist/dynamics/mobile';
import {convertIconToHtml, Icon} from '@xh/hoist/icon';
import {computed, observer} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {isDisplayed, logDebug, logWithDebug, consumeEvent} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {
    compact,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    isNil,
    isString,
    max,
    maxBy,
    debounce,
    merge
} from 'lodash';
import PT from 'prop-types';
import {createRef, isValidElement} from 'react';
import './Grid.scss';
import {GridModel} from './GridModel';
import {columnGroupHeader} from './impl/ColumnGroupHeader';
import {columnHeader} from './impl/ColumnHeader';
import {RowKeyNavSupport} from './impl/RowKeyNavSupport';

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
export const [Grid, grid] = hoistCmp.withFactory({
    displayName: 'Grid',
    model: uses(GridModel),
    className: 'xh-grid',

    /**
     * @param {GridModel} model
     * @param {string} className
     * @param props
     * @param ref
     */
    render({model, className, ...props}, ref) {
        const {store, treeMode, treeStyle, highlightRowOnClick, colChooserModel, filterModel} = model,
            impl = useLocalModel(() => new GridLocalModel(model, props)),
            platformColChooser = XH.isMobileApp ? mobileColChooser : desktopColChooser,
            maxDepth = impl.isHierarchical ? store.maxDepth : null;

        className = classNames(
            className,
            impl.isHierarchical ? `xh-grid--hierarchical xh-grid--max-depth-${maxDepth}` : 'xh-grid--flat',
            treeMode ? getTreeStyleClasses(treeStyle) : null,
            highlightRowOnClick ? 'xh-grid--highlight-row-on-click' : null
        );

        return fragment(
            frame({
                className,
                item: agGrid({...getLayoutProps(props), ...impl.agOptions}),
                onKeyDown: impl.onKeyDown,
                ref: composeRefs(impl.viewRef, ref)
            }),
            (colChooserModel ? platformColChooser({model: colChooserModel}) : null),
            (filterModel ? gridFilterDialog({model: filterModel}) : null)
        );
    }
});

Grid.MULTIFIELD_ROW_HEIGHT = 38;

Grid.propTypes = {
    /**
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API. It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     *
     * Note that changes to these options after the component's initial render will be ignored.
     */
    agOptions: PT.object,

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(GridModel), PT.object]),

    /**
     * Callback when the grid has initialized. The component will call this with the ag-Grid
     * event after running its internal handler to associate the ag-Grid APIs with its model.
     */
    onGridReady: PT.func
};


//------------------------
// Implementation
//------------------------
class GridLocalModel extends HoistModel {

    /** @member {GridModel} */
    model;
    /** @member {Object} */
    agOptions;
    /** @member {RefObject} */
    viewRef = createRef();
    /** @member {number} */
    fixedRowHeight;

    getRowHeight(node) {
        const {model, agOptions} = this,
            {sizingMode, groupRowHeight} = model,
            {groupDisplayType} = agOptions;

        if (node?.group) {
            return (
                groupRowHeight ??
                groupDisplayType === 'groupRows' ?
                    AgGrid.getGroupRowHeightForSizingMode(sizingMode) :
                    AgGrid.getRowHeightForSizingMode(sizingMode)
            );
        }
        return this.fixedRowHeight;
    }

    /** @returns {boolean} - true if any root-level records have children */
    @computed
    get isHierarchical() {
        const {model} = this;
        return model.treeMode && model.store.allRootCount !== model.store.allCount;
    }

    @computed
    get emptyText() {
        const {store, hideEmptyTextBeforeLoad, emptyText} = this.model;
        if (hideEmptyTextBeforeLoad && !store.lastLoaded) return null;
        return emptyText;
    }

    constructor(model, props) {
        super();
        this.model = model;
        this.rowKeyNavSupport = XH.isDesktop ? new RowKeyNavSupport(model) : null;
        this.addReaction(this.selectionReaction());
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.columnStateReaction());
        this.addReaction(this.dataReaction());
        this.addReaction(this.groupReaction());
        this.addReaction(this.rowHeightReaction());
        this.addReaction(this.sizingModeReaction());
        this.addReaction(this.validationDisplayReaction());

        this.agOptions = merge(this.createDefaultAgOptions(), props.agOptions || {});
    }

    createDefaultAgOptions() {
        const {model} = this,
            {clicksToEdit, selModel} = model;

        // 'immutableData' and 'rowDataChangeDetectionStrategy' props both deal with a *new* sets of rowData.
        // We use transactions instead, but our data fully immutable so seems safest to set these as well.
        let ret = {
            model: model.agGridModel,
            immutableData: true,
            rowDataChangeDetectionStrategy: 'IdentityCheck',
            suppressColumnVirtualisation: !model.useVirtualColumns,
            getRowNodeId: (record) => record.agId,
            defaultColDef: {
                sortable: true,
                resizable: true,
                suppressMenu: true,
                menuTabs: ['filterMenuTab']
            },
            popupParent: document.querySelector('body'),
            suppressAggFuncInHeader: true,
            icons: {
                groupExpanded: Icon.angleDown({asHtml: true, className: 'ag-group-expanded'}),
                groupContracted: Icon.angleRight({asHtml: true, className: 'ag-group-contracted'}),
                clipboardCopy: Icon.copy({asHtml: true})
            },
            frameworkComponents: {
                agColumnHeader: (props) => columnHeader({gridModel: model, ...props}),
                agColumnGroupHeader: (props) => columnGroupHeader(props)
            },
            rowSelection: selModel.mode,
            suppressRowClickSelection: !selModel.isEnabled,
            isRowSelectable: () => selModel.isEnabled,
            tooltipShowDelay: 0,
            getRowHeight: ({node}) => this.getRowHeight(node),
            getRowClass: ({data}) => model.rowClassFn ? model.rowClassFn(data) : null,
            rowClassRules: model.rowClassRules,
            noRowsOverlayComponentFramework: observer(() => div(this.emptyText)),
            onCellContextMenu: model.onCellContextMenu,
            onCellClicked: model.onCellClicked,
            onCellDoubleClicked: model.onCellDoubleClicked,
            onCellMouseDown: this.onCellMouseDown,
            onRowClicked: this.onRowClicked,
            onRowDoubleClicked: this.onRowDoubleClicked,
            onRowGroupOpened: this.onRowGroupOpened,
            onSelectionChanged: this.onSelectionChanged,
            onDragStopped: this.onDragStopped,
            onColumnResized: this.onColumnResized,
            onColumnRowGroupChanged: this.onColumnRowGroupChanged,
            onColumnPinned: this.onColumnPinned,
            onColumnVisible: this.onColumnVisible,
            onCellEditingStarted: model.onCellEditingStarted,
            onCellEditingStopped: model.onCellEditingStopped,
            navigateToNextCell: this.navigateToNextCell,
            processCellForClipboard: this.processCellForClipboard,
            defaultGroupOrderComparator: model.groupSortFn ? this.groupSortComparator : undefined,
            groupDefaultExpanded: 1,
            groupDisplayType: 'groupRows',
            groupRowRendererFramework: model.groupRowElementRenderer,
            groupRowRendererParams: {
                innerRenderer: model.groupRowRenderer,
                suppressCount: !model.showGroupRowCounts
            },
            autoGroupColumnDef: {
                suppressSizeToFit: true // Without this the auto group col will get shrunk when we size to fit
            },
            autoSizePadding: 3, // tighten up cells for ag-Grid native autosizing.  Remove when Hoist autosizing no longer experimental,
            editType: model.fullRowEditing ? 'fullRow' : undefined,
            singleClickEdit: clicksToEdit === 1,
            suppressClickEdit: clicksToEdit !== 1 && clicksToEdit !== 2,
            stopEditingWhenCellsLoseFocus: true
        };

        // Platform specific defaults
        if (XH.isMobileApp) {
            ret = {
                ...ret,
                suppressContextMenu: true,
                allowContextMenuWithControlKey: false
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
                groupDisplayType: 'custom',
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
        const {model, agOptions} = this,
            {store, selModel, contextMenu} = model;
        if (!contextMenu || XH.isMobileApp) return null;

        let menu = null;
        if (isFunction(contextMenu)) {
            menu = contextMenu(params, model);
        } else if (isArray(contextMenu) && !isEmpty(contextMenu)) {
            menu = new StoreContextMenu({items: contextMenu, gridModel: model});
        }
        if (!menu) return null;

        const recId = params.node?.data.id,
            colId = params.column?.colId,
            record = isNil(recId) ? null : store.getById(recId, true),
            column = isNil(colId) ? null : model.getColumn(colId),
            {selectedRecords} = model;


        if (!agOptions.suppressRowClickSelection) {
            // Adjust selection to target record -- and sync to grid immediately.
            if (record && !selectedRecords.includes(record)) {
                selModel.select(record);
            }

            if (!record) selModel.clear();
        }

        return this.buildMenuItems(menu.items, record, selModel.selectedRecords, column, params);
    };

    buildMenuItems(recordActions, record, selectedRecords, column, agParams) {
        const items = [];

        recordActions.forEach(action => {
            if (isNil(action)) return;

            if (action === '-') {
                items.push('separator');
                return;
            }

            if (isString(action)) {
                items.push(action);
                return;
            }

            const actionParams = {
                record,
                selectedRecords,
                gridModel: this.model,
                column,
                agParams
            };

            const displaySpec = action.getDisplaySpec(actionParams);
            if (displaySpec.hidden) return;

            let childItems;
            if (!isEmpty(displaySpec.items)) {
                const menu = new StoreContextMenu({items: displaySpec.items, gridModel: this.gridModel});
                childItems = this.buildMenuItems(menu.items, record, selectedRecords, column, actionParams);
            }

            let icon = displaySpec.icon;
            if (isValidElement(icon)) {
                icon = convertIconToHtml(icon);
            }

            const cssClasses = ['xh-grid-menu-option'];
            if (displaySpec.intent) cssClasses.push(`xh-grid-menu-option--intent-${displaySpec.intent}`);
            if (displaySpec.className) cssClasses.push(displaySpec.className);

            items.push({
                name: displaySpec.text,
                shortcut: displaySpec.secondaryText,
                icon,
                cssClasses,
                subMenu: childItems,
                tooltip: displaySpec.tooltip,
                disabled: displaySpec.disabled,
                action: () => action.call(actionParams)
            });
        });

        return items.filter(filterConsecutiveMenuSeparators());
    }

    //------------------------
    // Reactions to model
    //------------------------
    dataReaction() {
        const {model} = this,
            {store} = model;
        return {
            track: () => [model.isReady, store._filtered, model.showSummary, store.summaryRecord],
            run: () => {
                if (model.isReady) this.syncData();
            }
        };
    }

    selectionReaction() {
        const {model} = this;
        return {
            track: () => [model.isReady, model.selectedRecords],
            run: () => {
                if (model.isReady) this.syncSelection();
            }
        };
    }

    sortReaction() {
        const {model} = this;
        return {
            track: () => [model.agColumnApi, model.sortBy],
            run: ([colApi, sortBy]) => {
                if (colApi && !model.externalSort) {
                    model.agGridModel.applySortBy(sortBy);
                }
            }
        };
    }

    groupReaction() {
        const {model} = this;
        return {
            track: () => [model.agColumnApi, model.groupBy],
            run: ([colApi, groupBy]) => {
                if (colApi) colApi.setRowGroupColumns(groupBy);
            }
        };
    }

    rowHeightReaction() {
        const {model} = this;
        return {
            track: () => [model.getVisibleLeafColumns(), model.sizingMode],
            run: ([visibleCols, sizingMode]) => {
                this.fixedRowHeight = max([
                    AgGrid.getRowHeightForSizingMode(sizingMode),
                    maxBy(visibleCols, 'rowHeight')?.rowHeight
                ]);
            },
            fireImmediately: true
        };
    }

    columnsReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.columns],
            run: ([api]) => {
                if (!api) return;

                this.doWithPreservedState({expansion: false, filters: true}, () => {
                    api.setColumnDefs(this.getColumnDefs());
                });
            }
        };
    }

    columnStateReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.agColumnApi, model.columnState],
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
                    let hasChanges = false;
                    colState.forEach((col, index) => {
                        const agCol = agColState[index],
                            id = col.colId;

                        if (agCol.width !== col.width) {
                            colApi.setColumnWidth(id, col.width);
                            hasChanges = true;
                        }
                        if (agCol.hide !== col.hidden) {
                            colApi.setColumnVisible(id, !col.hidden);
                            hasChanges = true;
                        }
                        if (agCol.pinned !== col.pinned) {
                            colApi.setColumnPinned(id, col.pinned);
                            hasChanges = true;
                        }
                    });

                    // We need to tell agGrid to refresh its flexed column sizes due to
                    // a regression introduced in 25.1.0.  See #2341
                    if (hasChanges) {
                        colApi.columnModel.refreshFlexedColumns({
                            updateBodyWidths: true,
                            fireResizedEvent: true
                        });
                    }

                    return;
                }

                // 2) Otherwise do an (expensive) full refresh of column state
                // Merge our state onto the ag column state to get any state which we do not yet support
                colState = colState.map(({colId, width, hidden, pinned}) => {
                    const agCol = agColState.find(c => c.colId === colId) || {};
                    return {
                        colId,
                        ...agCol,
                        width,
                        pinned,
                        hide: hidden
                    };
                });

                this.doWithPreservedState({expansion: false}, () => {
                    colApi.applyColumnState({state: colState, applyOrder: true});
                });
            }
        };
    }

    sizingModeReaction() {
        const {model} = this,
            {mode} = model.autosizeOptions;

        return {
            track: () => model.sizingMode,
            run: () => {
                if (mode === GridAutosizeMode.MANAGED || mode === GridAutosizeMode.ON_SIZING_MODE_CHANGE) {
                    model.autosizeAsync({showMask: true});
                }
            }
        };
    }

    validationDisplayReaction() {
        const {model} = this,
            {store} = model;

        return {
            track: () => [model.isReady, store.validator.errors],
            run: () => {
                const {isReady, columns, agApi} = model;
                if (!isReady) return;

                const refreshCols = columns.filter(c => c.editor || c.rendererIsComplex);
                if (!isEmpty(refreshCols)) {
                    const colIds = refreshCols.map(c => c.colId);
                    agApi.refreshCells({columns: colIds, force: true});
                }
            },
            debounce: 1
        };
    }

    updatePinnedSummaryRowData() {
        const {model} = this,
            {store, showSummary, agGridModel} = model,
            {agApi} = agGridModel,
            filterSummaryFn = (record) => !record.isSummary,
            pinnedTopRowData = agGridModel.getPinnedTopRowData().filter(filterSummaryFn),
            pinnedBottomRowData = agGridModel.getPinnedBottomRowData().filter(filterSummaryFn);

        if (showSummary && store.summaryRecord) {
            if (showSummary === 'bottom') {
                pinnedBottomRowData.push(store.summaryRecord);
            } else {
                pinnedTopRowData.unshift(store.summaryRecord);
            }
        }

        agApi.setPinnedTopRowData(pinnedTopRowData);
        agApi.setPinnedBottomRowData(pinnedBottomRowData);
    }

    @logWithDebug
    genTransaction(newRs, prevRs) {
        if (!prevRs) return {add: newRs.list};

        const newList = newRs.list,
            prevList = prevRs.list;

        let add = [], update = [], remove = [];
        newList.forEach(rec => {
            const existing = prevRs.getById(rec.id);
            if (!existing) {
                add.push(rec);
            } else if (existing !== rec) {
                update.push(rec);
            }
        });

        if (newList.length !== (prevList.length + add.length)) {
            remove = prevList.filter(rec => !newRs.getById(rec.id));
        }

        // Only include lists in transaction if non-empty (ag-grid is not internally optimized)
        const ret = {};
        if (!isEmpty(add)) ret.add = add;
        if (!isEmpty(update)) ret.update = update;
        if (!isEmpty(remove)) ret.remove = remove;
        return ret;
    }

    @logWithDebug
    syncData() {
        const {model} = this,
            {agGridModel, store, agApi} = model,
            newRs = store._filtered,
            prevRs = this._prevRs,
            prevCount = prevRs ? prevRs.count : 0;

        let transaction = null;
        if (prevCount !== 0) {
            transaction = this.genTransaction(newRs, prevRs);
            logDebug(this.transactionLogStr(transaction), this);

            if (!this.transactionIsEmpty(transaction)) {
                agApi.applyTransaction(transaction);
            }

        } else {
            agApi.setRowData(newRs.list);
        }

        if (model.externalSort) {
            agGridModel.applySortBy(model.sortBy);
        }

        this.updatePinnedSummaryRowData();

        if (transaction?.update) {
            const visibleCols = model.getVisibleLeafColumns();

            // Refresh cells in columns with complex renderers
            const refreshCols = visibleCols.filter(c => c.rendererIsComplex);
            if (!isEmpty(refreshCols)) {
                const rowNodes = compact(transaction.update.map(r => agApi.getRowNode(r.agId))),
                    columns = refreshCols.map(c => c.colId);
                agApi.refreshCells({rowNodes, columns, force: true});
            }
        }

        if (!transaction || transaction.add || transaction.remove) {
            wait().then(() => this.syncSelection());
        }

        if (model.autosizeOptions.mode === GridAutosizeMode.MANAGED) {
            // If sizingMode different to autosizeState, autosize all columns...
            if (model.autosizeState.sizingMode !== model.sizingMode) {
                model.autosizeAsync();
            } else {
                // ...otherwise, only autosize columns that are not manually sized
                const columns = model.getLeafColumnIds().filter(colId => {
                    const state = model.findColumn(model.columnState, colId);
                    return state && !state.manuallySized;
                });
                model.autosizeAsync({columns});
            }
        }

        model.noteAgExpandStateChange();

        this._prevRs = newRs;
    }

    syncSelection() {
        const {agGridModel, selModel, isReady} = this.model;
        const selectedIds = selModel.selectedRecords.map(r => r.agId);
        if (isReady && !isEqual(selectedIds, agGridModel.getSelectedRowNodeIds())) {
            agGridModel.setSelectedRowNodeIds(selectedIds);
        }
    }

    transactionIsEmpty(t) {
        return isEmpty(t.update) && isEmpty(t.add) && isEmpty(t.remove);
    }

    transactionLogStr(t) {
        return `[update: ${t.update ? t.update.length : 0} | add: ${t.add ? t.add.length : 0} | remove: ${t.remove ? t.remove.length : 0}]`;
    }

    //------------------------
    // Event Handlers on AG Grid.
    //------------------------
    getDataPath = (record) => {
        return record.treePath;
    };

    // We debounce this handler because the implementation of `AgGridModel.setSelectedRowNodeIds()`
    // selects nodes one-by-one, and ag-Grid will fire a selection changed event for each iteration.
    // This avoids a storm of events looping through the reaction when selecting in bulk.
    onSelectionChanged = debounce(() => {
        this.model.noteAgSelectionStateChanged();
        this.syncSelection();
    }, 0);

    // Catches column re-ordering, resizing AND pinning via user drag-and-drop interaction.
    onDragStopped = (ev) => {
        this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
    };

    // Catches column resizing on call to autoSize API.
    onColumnResized = (ev) => {
        if (!isDisplayed(this.viewRef.current) || !ev.finished) return;
        if (ev.source === 'uiColumnDragged') {
            const colId = ev.columns[0].colId,
                width = ev.columnApi.getColumnState().find(it => it.colId === colId)?.width;
            this.model.noteColumnManuallySized(colId, width);
        } else if (ev.source === 'autosizeColumns') {
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
        this.model.noteAgExpandStateChange();
    };

    // Catches column pinning changes triggered from ag-grid ui components
    onColumnPinned = (ev) => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
        }
    };

    // Catches column visibility changes triggered from ag-grid ui components
    onColumnVisible = (ev) => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
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

    processCellForClipboard = ({value, node, column}) => {
        const record = node.data,
            {model} = this,
            {colId} = column,
            xhColumn = !isNil(colId) ? model.getColumn(colId) : null;

        if (!record || !xhColumn) return value;

        return XH.gridExportService.getExportableValueForCell({
            gridModel: model,
            record,
            column: xhColumn,
            node
        });
    }

    navigateToNextCell = (agParams) => {
        return this.rowKeyNavSupport?.navigateToNextCell(agParams);
    };

    onCellMouseDown = (evt) => {
        const {model} = this;
        if (model.highlightRowOnClick) {
            model.agApi.flashCells({
                rowNodes: [evt.node],
                flashDelay: 100,
                fadeDelay: 100
            });
        }
    };

    onKeyDown = (evt) => {
        const {model} = this,
            {selModel} = model;

        if ((evt.ctrlKey || evt.metaKey) && evt.key === 'a' && selModel.mode === 'multiple') {
            selModel.selectAll();
            return;
        }

        model.onKeyDown?.(evt);
    };

    onRowClicked = (evt) => {
        const {model} = this,
            {node, event} = evt,
            {selModel, treeMode, clicksToExpand, agApi} = model;

        if (evt.rowPinned) {
            selModel.clear();
        }

        model.onRowClicked?.(evt);

        if (!event.defaultPrevented && treeMode && clicksToExpand === 1 && node?.allChildrenCount) {
            agApi.setRowNodeExpanded(node, !node.expanded);
            consumeEvent(event);
        }
    };

    onRowDoubleClicked = (evt) => {
        const {model} = this,
            {node, event} = evt,
            {treeMode, clicksToExpand, agApi} = model;

        model.onRowDoubleClicked?.(evt);

        if (!event.defaultPrevented && treeMode && clicksToExpand === 2 && node?.allChildrenCount) {
            agApi.setRowNodeExpanded(node, !node.expanded);
            consumeEvent(event);
        }
    };
}

/**
 * @callback Grid~groupRowRendererFn - renderer for a group row
 * @param {ICellRendererParams} context - The group renderer params from ag-Grid.
 * @return {string} - the formatted value for display.
 */

/**
 * @callback Grid~groupRowElementRendererFn - renderer for a group row
 * @param {ICellRendererParams} context - The group renderer params from ag-Grid.
 * @return {Element} - the React element to render.
 */
