/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridApi, AgColumnState} from '@xh/hoist/kit/ag-grid';

import composeRefs from '@seznam/compose-react-refs';
import {agGrid, AgGrid} from '@xh/hoist/cmp/ag-grid';
import {ColumnState, getTreeStyleClasses} from '@xh/hoist/cmp/grid';
import {gridHScrollbar} from '@xh/hoist/cmp/grid/impl/GridHScrollbar';
import {getAgGridMenuItems} from '@xh/hoist/cmp/grid/impl/MenuSupport';
import {div, fragment, frame, vframe} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    PlainObject,
    ReactionSpec,
    TestSupportProps,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {RecordSet} from '@xh/hoist/data/impl/RecordSet';
import {
    colChooser as desktopColChooser,
    gridFilterDialog,
    ModalSupportModel
} from '@xh/hoist/dynamics/desktop';
import {colChooser as mobileColChooser} from '@xh/hoist/dynamics/mobile';
import {Icon} from '@xh/hoist/icon';

import type {
    ColDef,
    ColGroupDef,
    GetContextMenuItemsParams,
    GridOptions,
    GridReadyEvent,
    ProcessCellForExportParams
} from '@xh/hoist/kit/ag-grid';
import {computed, observer} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {consumeEvent, isDisplayed, logWithDebug} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, debounce, isBoolean, isEmpty, isEqual, isNil, max, maxBy, merge} from 'lodash';
import './Grid.scss';
import {GridModel} from './GridModel';
import {columnGroupHeader} from './impl/ColumnGroupHeader';
import {columnHeader} from './impl/ColumnHeader';
import {RowKeyNavSupport} from './impl/RowKeyNavSupport';

export interface GridProps extends HoistProps<GridModel>, LayoutProps, TestSupportProps {
    /**
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API. It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     *
     * Note that changes to these options after the component's initial render will be ignored.
     */
    agOptions?: GridOptions;

    /**
     * Callback when the grid has initialized. The component will call this with the ag-Grid
     * event after running its internal handler to associate the ag-Grid APIs with its model.
     */
    onGridReady?: (e: GridReadyEvent) => void;
}

/**
 * The primary rich data grid component within the Hoist toolkit.
 * It is a highly managed wrapper around ag-Grid and is the main display component for GridModel.
 *
 * Applications should typically configure and interact with Grids via a GridModel, which provides
 * support for specifying the Grid's data Store, Column definitions, sorting and grouping state,
 * selection API, and more.
 *
 * For advanced ag-Grid use-cases that are not well supported by this component, note that the
 * {@link AgGrid} Hoist component provides much thinner and less opinionated wrapper around ag-Grid
 * while still retaining consistent styling and some additional conveniences. However a number of
 * core Hoist integrations and features will *not* be available with that thinner wrapper.
 *
 * @see {@link https://www.ag-grid.com/javascript-grid-reference-overview/|ag-Grid Docs}
 * @see GridModel
 */
export const [Grid, grid] = hoistCmp.withFactory<GridProps>({
    displayName: 'Grid',
    model: uses(GridModel),
    className: 'xh-grid',

    render({model, className, testId, ...props}, ref) {
        const {store, treeMode, treeStyle, highlightRowOnClick, colChooserModel, filterModel} =
                model,
            impl = useLocalModel(GridLocalModel),
            platformColChooser = XH.isMobileApp ? mobileColChooser : desktopColChooser,
            maxDepth = impl.isHierarchical ? store.maxDepth : null;

        className = classNames(
            className,
            impl.isHierarchical
                ? `xh-grid--hierarchical xh-grid--max-depth-${maxDepth}`
                : 'xh-grid--flat',
            treeMode ? getTreeStyleClasses(treeStyle) : null,
            highlightRowOnClick ? 'xh-grid--highlight-row-on-click' : null
        );

        const {enableFullWidthScroll} = model.experimental,
            container = enableFullWidthScroll ? vframe : frame;

        return fragment(
            container({
                className,
                items: [
                    agGrid({
                        model: model.agGridModel,
                        ...getLayoutProps(props),
                        ...impl.agOptions
                    }),
                    gridHScrollbar({
                        omit: !enableFullWidthScroll,
                        gridLocalModel: impl
                    })
                ],
                testId,
                onKeyDown: impl.onKeyDown,
                ref: composeRefs(impl.viewRef, ref)
            }),
            colChooserModel ? platformColChooser({model: colChooserModel}) : null,
            filterModel ? gridFilterDialog({model: filterModel}) : null
        );
    }
});

(Grid as any).ZONEGRID_ROW_HEIGHT = 42;

//------------------------
// Implementation
//------------------------
export class GridLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(GridModel)
    private model: GridModel;
    agOptions: GridOptions;
    viewRef = createObservableRef<HTMLElement>();
    private rowKeyNavSupport: RowKeyNavSupport;
    private prevRs: RecordSet;

    /** @returns true if any root-level records have children */
    @computed
    get isHierarchical(): boolean {
        const {model} = this;
        return model.treeMode && model.store.allRootCount !== model.store.allCount;
    }

    @computed
    get emptyText() {
        const {store, hideEmptyTextBeforeLoad, emptyText} = this.model;
        if (hideEmptyTextBeforeLoad && !store.lastLoaded) return null;
        return emptyText;
    }

    constructor() {
        super();
        GridLocalModel.addFocusFixListener();
    }

    override onLinked() {
        this.rowKeyNavSupport = XH.isDesktop ? new RowKeyNavSupport(this.model) : null;
        this.addReaction(
            this.selectionReaction(),
            this.sortReaction(),
            this.columnsReaction(),
            this.columnStateReaction(),
            this.dataReaction(),
            this.groupReaction(),
            this.rowHeightReaction(),
            this.sizingModeReaction(),
            this.validationDisplayReaction(),
            this.modalReaction()
        );

        this.agOptions = merge(this.createDefaultAgOptions(), this.componentProps.agOptions || {});
    }

    private createDefaultAgOptions(): GridOptions {
        const {model} = this,
            {clicksToEdit, selModel} = model;

        let ret: GridOptions = {
            reactiveCustomComponents: true, // will be default in ag-grid v32
            animateRows: false,
            suppressColumnVirtualisation: !model.useVirtualColumns,
            getRowId: ({data}) => data.agId,
            defaultColDef: {
                sortable: true,
                resizable: true,
                suppressHeaderMenuButton: true,
                menuTabs: ['filterMenuTab']
            },
            popupParent: document.querySelector('body'),
            suppressAggFuncInHeader: true,
            icons: {
                groupExpanded: Icon.groupRowExpanded({
                    asHtml: true,
                    className: 'ag-group-expanded'
                }),
                groupContracted: Icon.groupRowCollapsed({
                    asHtml: true,
                    className: 'ag-group-contracted'
                }),
                clipboardCopy: Icon.copy({asHtml: true})
            },
            components: {
                agColumnHeader: props => columnHeader({...props, gridModel: model}),
                agColumnGroupHeader: props => columnGroupHeader({...props, gridModel: model})
            },
            tooltipShowDelay: 0,
            getRowHeight: this.defaultGetRowHeight,
            getRowClass: ({data}) => (model.rowClassFn ? model.rowClassFn(data) : null),
            rowClassRules: model.rowClassRules,
            noRowsOverlayComponent: observer(() => div(this.emptyText)),
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
            initialGroupOrderComparator: model.groupSortFn ? this.groupSortComparator : undefined,
            groupDefaultExpanded: model.expandLevel,
            groupDisplayType: 'groupRows',
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
            stopEditingWhenCellsLoseFocus: true,
            suppressLastEmptyLineOnPaste: true,
            suppressClipboardApi: true,
            // Override AG-Grid's default behavior of automatically unpinning columns to make the center viewport visible
            processUnpinnedColumns: () => []
        };

        if (selModel.mode != 'disabled') {
            ret.rowSelection = {
                mode: selModel.mode == 'single' ? 'singleRow' : 'multiRow',
                enableClickSelection: selModel.isEnabled,
                isRowSelectable: () => selModel.isEnabled,
                checkboxes: false,
                headerCheckbox: false
            };
        }

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
                groupDisplayType: 'custom',
                treeData: true,
                getDataPath: this.getDataPath
            };
        }

        // Support for FullWidthScroll
        if (model.experimental.enableFullWidthScroll) {
            ret.suppressHorizontalScroll = true;
        }

        return ret;
    }

    //------------------------
    // Support for defaults
    //------------------------
    getColumnDefs(): Array<ColDef | ColGroupDef> {
        return this.model.columns.map(col => col.getAgSpec());
    }

    getContextMenuItems = (params: GetContextMenuItemsParams) => {
        const {model, agOptions} = this,
            {contextMenu} = model;
        if (!contextMenu || XH.isMobileApp || model.isEditing) return null;

        // Manipulate selection if needed.
        if (model.selModel.isEnabled) {
            const record = params.node?.data,
                {selModel} = model;

            // Adjust selection to target record -- and sync to grid immediately.
            if (record && !selModel.selectedRecords.includes(record)) {
                selModel.select(record);
            }
            if (!record) selModel.clear();
        }

        const ret = getAgGridMenuItems(params, model, contextMenu);
        if (isEmpty(ret)) return null;

        return ret;
    };

    //------------------------
    // Reactions to model
    //------------------------
    dataReaction() {
        const {model} = this,
            {store} = model;
        return {
            track: () => [model.isReady, store._filtered, model.showSummary, store.summaryRecords],
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
            track: () => [model.agApi, model.sortBy],
            run: ([agApi, sortBy]) => {
                if (agApi && !model.externalSort) {
                    model.agGridModel.applySortBy(sortBy);
                }
            }
        };
    }

    groupReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.groupBy],
            run: ([agApi, groupBy]) => {
                if (agApi) agApi.setRowGroupColumns(groupBy);
            }
        };
    }

    //----------------------
    // Row Height Management
    //----------------------
    @computed
    get calculatedRowHeight() {
        const {model} = this,
            AgGridCmp = AgGrid as any;
        return max([
            AgGridCmp.getRowHeightForSizingMode(model.sizingMode),
            maxBy(model.getVisibleLeafColumns(), 'rowHeight')?.rowHeight
        ]);
    }

    @computed
    get calculatedGroupRowHeight() {
        const {sizingMode, groupRowHeight} = this.model,
            {groupDisplayType} = this.agOptions,
            AgGridCmp = AgGrid as any;
        return (
            groupRowHeight ??
            (groupDisplayType === 'groupRows'
                ? AgGridCmp.getGroupRowHeightForSizingMode(sizingMode)
                : AgGridCmp.getRowHeightForSizingMode(sizingMode))
        );
    }

    defaultGetRowHeight = ({node}) => {
        return node.group ? this.calculatedGroupRowHeight : this.calculatedRowHeight;
    };

    rowHeightReaction() {
        return {
            track: () => [
                this.useScrollOptimization,
                this.calculatedRowHeight,
                this.calculatedGroupRowHeight
            ],
            run: () => {
                const {agApi} = this.model;
                if (!agApi) return;
                agApi.resetRowHeights();
                this.applyScrollOptimization();
            },
            debounce: 1
        };
    }

    @computed
    get useScrollOptimization() {
        // When true, we preemptively evaluate and assign functional row heights after data loading.
        // This improves slow scrolling but means function not guaranteed to be re-called
        // when node is rendered in viewport.
        const {model, agOptions} = this;
        return (
            agOptions.getRowHeight &&
            !agOptions.rowHeight &&
            !model.getVisibleLeafColumns().some(c => c.autoHeight) &&
            model.experimental.useScrollOptimization !== false
        );
    }

    applyScrollOptimization() {
        if (!this.useScrollOptimization) return;
        const {agApi} = this.model,
            {getRowHeight} = this.agOptions,
            params = {api: agApi, context: null} as any;

        agApi.forEachNode(node => {
            params.node = node;
            params.data = node.data;
            node.setRowHeight(getRowHeight(params));
        });
        agApi.onRowHeightChanged();
    }

    columnsReaction() {
        const {model} = this;
        return {
            track: () => [model.agApi, model.columns],
            run: ([api]) => {
                if (!api) return;

                this.doWithPreservedState({expansion: false, filters: true}, () => {
                    api.updateGridOptions({columnDefs: this.getColumnDefs()});
                });
            }
        };
    }

    columnStateReaction(): ReactionSpec<[GridApi, ColumnState[]]> {
        const {model} = this;
        return {
            track: () => [model.agApi, model.columnState],
            run: ([api, colState]) => {
                if (!api) return;

                const agColState = api.getColumnState();

                // Insert the auto group col state if it exists, since we won't have it in our column state list
                const autoColState = agColState.find(c => c.colId === 'ag-Grid-AutoColumn');
                if (autoColState) {
                    const {colId, width, hide, pinned} = autoColState;
                    colState.splice(agColState.indexOf(autoColState), 0, {
                        colId,
                        width,
                        hidden: hide,
                        pinned: isBoolean(pinned) ? (pinned ? 'left' : null) : pinned
                    });
                }

                // Determine if column order has changed
                const applyOrder = !isEqual(
                    colState.map(c => c.colId),
                    agColState.map(c => c.colId)
                );

                // Build a list of column state changes
                colState = compact(
                    colState.map(({colId, width, hidden, pinned}) => {
                        const agCol: AgColumnState = agColState.find(c => c.colId === colId) || {
                                colId
                            },
                            ret: any = {colId};

                        let hasChanges = applyOrder;

                        if (agCol.width !== width) {
                            ret.width = width;
                            hasChanges = true;
                        }

                        if (agCol.hide !== hidden) {
                            ret.hide = hidden;
                            hasChanges = true;
                        }

                        if (agCol.pinned !== pinned) {
                            ret.pinned = pinned;
                            hasChanges = true;
                        }

                        return hasChanges ? ret : null;
                    })
                );

                if (isEmpty(colState)) return;

                this.doWithPreservedState({expansion: false}, () => {
                    api.applyColumnState({state: colState, applyOrder});
                });
            }
        };
    }

    sizingModeReaction() {
        const {model} = this;

        return {
            track: () => model.sizingMode,
            run: () => {
                const {mode} = model.autosizeOptions;
                if (mode === 'managed' || mode === 'onSizingModeChange') {
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
                const {isReady, agApi} = model;
                if (!isReady) return;

                const refreshCols = model
                    .getLeafColumns()
                    .filter(c => c.editor || c.rendererIsComplex);
                if (!isEmpty(refreshCols)) {
                    const colIds = refreshCols.map(c => c.colId);
                    agApi.refreshCells({columns: colIds, force: true});
                }
            },
            debounce: 0
        };
    }

    modalReaction() {
        // Force Grid to redraw rows when switching between inline and modal views
        const modalSupportModel = ModalSupportModel ? this.lookupModel(ModalSupportModel) : null;
        if (!modalSupportModel) return null;

        return {
            track: () => (modalSupportModel as any).isModal,
            run: () => this.model.agApi.redrawRows(),
            debounce: 0
        };
    }

    updatePinnedSummaryRowData() {
        const {model} = this,
            {store, showSummary, agGridModel} = model,
            {agApi} = agGridModel,
            filterSummaryFn = record => !record.isSummary,
            pinnedTopRowData = agGridModel.getPinnedTopRowData().filter(filterSummaryFn),
            pinnedBottomRowData = agGridModel.getPinnedBottomRowData().filter(filterSummaryFn);

        if (showSummary && !isEmpty(store.summaryRecords)) {
            if (showSummary === 'bottom') {
                pinnedBottomRowData.push(...store.summaryRecords);
            } else {
                pinnedTopRowData.unshift(...store.summaryRecords);
            }
        }

        agApi.updateGridOptions({
            pinnedTopRowData,
            pinnedBottomRowData
        });
    }

    @logWithDebug
    genTransaction(newRs, prevRs) {
        if (!prevRs) return {add: newRs.list};

        const newList = newRs.list,
            prevList = prevRs.list;

        let add = [],
            update = [],
            remove = [];
        newList.forEach(rec => {
            const existing = prevRs.getById(rec.id);
            if (!existing) {
                add.push(rec);
            } else if (existing !== rec) {
                update.push(rec);
            }
        });

        if (newList.length !== prevList.length + add.length) {
            remove = prevList.filter(rec => !newRs.getById(rec.id));
        }

        // Only include lists in transaction if non-empty (ag-grid is not internally optimized)
        const ret: any = {};
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
            prevRs = this.prevRs,
            prevCount = prevRs ? prevRs.count : 0;

        let transaction = null;
        if (prevCount !== 0) {
            transaction = this.genTransaction(newRs, prevRs);
            if (!this.transactionIsEmpty(transaction)) {
                this.logDebug(...this.genTxnLogMsgs(transaction));
                agApi.applyTransaction(transaction);
            }
        } else {
            agApi.updateGridOptions({rowData: newRs.list});
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
                const rowNodes = transaction.update
                        .map(r => agApi.getRowNode(r.agId))
                        .filter(n => n != null),
                    columns = refreshCols.map(c => c.colId);
                agApi.refreshCells({rowNodes, columns, force: true});
            }
        }

        if (!transaction || transaction.add || transaction.remove) {
            wait().then(() => this.syncSelection());
        }

        if (model.autosizeOptions.mode === 'managed') {
            const columns = model.columnState.filter(it => !it.manuallySized).map(it => it.colId);
            model.autosizeAsync({columns});
        }

        model.noteAgExpandStateChange();

        this.prevRs = newRs;
        this.applyScrollOptimization();
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

    private genTxnLogMsgs(t): string[] {
        const {add, update, remove} = t;
        return [
            `update: ${update ? update.length : 0}`,
            `add: ${add ? add.length : 0}`,
            `remove: ${remove ? remove.length : 0}`
        ];
    }

    //------------------------
    // Event Handlers on AG Grid.
    //------------------------
    getDataPath = record => {
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
    onDragStopped = ev => {
        this.model.noteAgColumnStateChanged(ev.api.getColumnState());
    };

    // Catches column resizing on call to autoSize API.
    onColumnResized = ev => {
        if (!isDisplayed(this.viewRef.current) || !ev.finished) return;
        if (ev.source === 'uiColumnResized') {
            const colId = ev.columns[0].colId,
                width = ev.api.getColumnState().find(it => it.colId === colId)?.width;
            this.model.noteColumnManuallySized(colId, width);
        } else if (ev.source === 'autosizeColumns') {
            this.model.noteAgColumnStateChanged(ev.api.getColumnState());
        }
    };

    // Catches row group changes triggered from ag-grid ui components
    onColumnRowGroupChanged = ev => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.setGroupBy(ev.api.getRowGroupColumns().map(it => it.colId));
        }
    };

    onRowGroupOpened = () => {
        this.model.noteAgExpandStateChange();
    };

    // Catches column pinning changes triggered from ag-grid ui components
    onColumnPinned = ev => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.noteAgColumnStateChanged(ev.api.getColumnState());
        }
    };

    // Catches column visibility changes triggered from ag-grid ui components
    onColumnVisible = ev => {
        if (ev.source !== 'api' && ev.source !== 'uiColumnDragged') {
            this.model.noteAgColumnStateChanged(ev.api.getColumnState());
        }
    };

    groupSortComparator = ({nodeA, nodeB}) => {
        const gridModel = this.model;
        return gridModel.groupSortFn(nodeA.key, nodeB.key, nodeA.field, {gridModel, nodeA, nodeB});
    };

    doWithPreservedState({filters}: PlainObject, fn) {
        const filterState = filters ? this.readFilterState() : null;
        fn();
        if (filterState) this.writeFilterState(filterState);
    }

    readFilterState() {
        return this.model.agGridModel.agApi.getFilterModel();
    }

    writeFilterState(filterState) {
        this.model.agGridModel.agApi.setFilterModel(filterState);
    }

    processCellForClipboard = ({value, node, column}: ProcessCellForExportParams) => {
        const record = node.data,
            {model} = this,
            colId = column.getColId(),
            xhColumn = !isNil(colId) ? model.getColumn(colId) : null;

        if (!record || !xhColumn) return value;

        return XH.gridExportService.getExportableValueForCell({
            gridModel: model,
            record,
            column: xhColumn,
            node
        });
    };

    navigateToNextCell = agParams => {
        return this.rowKeyNavSupport?.navigateToNextCell(agParams);
    };

    onCellMouseDown = evt => {
        const {model} = this;
        if (model.highlightRowOnClick) {
            model.agApi.flashCells({
                rowNodes: [evt.node],
                flashDuration: 100,
                fadeDuration: 100
            });
        }
    };

    onKeyDown = evt => {
        const {model} = this,
            {selModel} = model;

        if ((evt.ctrlKey || evt.metaKey) && evt.key === 'a' && selModel.mode === 'multiple') {
            selModel.selectAll();
            return;
        }

        model.onKeyDown?.(evt);
    };

    onRowClicked = evt => {
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

    onRowDoubleClicked = evt => {
        const {model} = this,
            {node, event} = evt,
            {treeMode, clicksToExpand, agApi} = model;

        model.onRowDoubleClicked?.(evt);

        if (!event.defaultPrevented && treeMode && clicksToExpand === 2 && node?.allChildrenCount) {
            agApi.setRowNodeExpanded(node, !node.expanded);
            consumeEvent(event);
        }
    };

    /**
     * When a `Grid` context menu is open at the same time as a BP `Overlay2` with `enforceFocus`,
     * the context menu will lose focus, causing menu items not to highlight on hover. Prevent this
     * by conditionally stopping the focus event from propagating.
     */
    private static didAddFocusFixListener = false;

    static addFocusFixListener() {
        if (this.didAddFocusFixListener) return;
        document.addEventListener(
            'focus',
            (e: FocusEvent) => {
                const {target} = e;
                if (target instanceof HTMLElement && target.classList.contains('ag-menu-option')) {
                    e.stopImmediatePropagation();
                }
            },
            true
        );
        this.didAddFocusFixListener = true;
    }
}
