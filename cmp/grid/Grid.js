/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {agGrid, AgGrid} from '@xh/hoist/cmp/ag-grid';
import {fragment, frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, XH} from '@xh/hoist/core';
import {colChooser as desktopColChooser, StoreContextMenu} from '@xh/hoist/dynamics/desktop';
import {colChooser as mobileColChooser} from '@xh/hoist/dynamics/mobile';
import {convertIconToHtml, Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {computed, observer} from '@xh/hoist/mobx';
import {isDisplayed, withShortDebug, apiRemoved} from '@xh/hoist/utils/js';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {getTreeStyleClasses} from '@xh/hoist/cmp/grid';
import {wait} from '@xh/hoist/promise';

import classNames from 'classnames';
import {
    compact,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    isNil,
    isString,
    merge,
    max,
    maxBy
} from 'lodash';
import PT from 'prop-types';
import {createRef, isValidElement} from 'react';
import './Grid.scss';
import {GridModel} from './GridModel';
import {columnGroupHeader} from './impl/ColumnGroupHeader';
import {columnHeader} from './impl/ColumnHeader';

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

    render({model, className, ...props}, ref) {
        apiRemoved(props.hideHeaders, 'hideHeaders', 'Specify hideHeaders on the GridModel instead.');

        const impl = useLocalModel(() => new LocalModel(model, props)),
            platformColChooser = XH.isMobileApp ? mobileColChooser : desktopColChooser;

        // Don't render the agGridReact element with data or columns. Instead rely on API methods
        return fragment(
            frame({
                className: classNames(
                    className,
                    impl.isHierarchical ? 'xh-grid--hierarchical' : 'xh-grid--flat',
                    model.treeMode ? getTreeStyleClasses(model.treeStyle) : null
                ),
                item: agGrid({
                    ...getLayoutProps(props),
                    ...impl.agOptions
                }),
                onKeyDown: impl.onKeyDown,
                ref: composeRefs(impl.viewRef, ref)
            }),
            (model.colChooserModel ? platformColChooser({model: model.colChooserModel}) : null)
        );
    }
});
Grid.MULTIFIELD_ROW_HEIGHT = 38;

Grid.propTypes = {
    /**
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
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


//------------------------
// Implementation
//------------------------
class LocalModel extends HoistModel {

    model;
    agOptions;
    propsKeyDown;
    viewRef = createRef();
    fixedRowHeight;

    getRowHeight(node) {
        const {model} = this;
        if (node?.group) {
            return model.groupRowHeight ?? AgGrid.getRowHeightForSizingMode(model.sizingMode);
        }
        return max([
            this.fixedRowHeight,
            model.agGridModel.getAutoRowHeight(node)
        ]);
    }

    // Do any root level records have children?
    @computed
    get isHierarchical() {
        const {model} = this;
        return model.treeMode && model.store.allRootCount !== model.store.allCount;
    }

    constructor(model, props) {
        super();
        this.model = model;
        this.addReaction(this.selectionReaction());
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.columnStateReaction());
        this.addReaction(this.dataReaction());
        this.addReaction(this.groupReaction());
        this.addReaction(this.rowHeightReaction());

        this.agOptions = merge(this.createDefaultAgOptions(props), props.agOptions || {});
        this.propsKeyDown = props.onKeyDown;
    }

    createDefaultAgOptions(props) {
        const {model} = this;

        // 'immutableData' and 'rowDataChangeDetectionStrategy' props both deal with a *new* sets of rowData.
        // We use transactions instead, but our data fully immutable so seems safest to set these as well.
        let ret = {
            model: model.agGridModel,
            immutableData: true,
            rowDataChangeDetectionStrategy: 'IdentityCheck',
            suppressColumnVirtualisation: !model.useVirtualColumns,
            getRowNodeId: (data) => data.id,
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
            rowSelection: model.selModel.mode,
            getRowHeight: ({node}) => this.getRowHeight(node),
            getRowClass: ({data}) => model.rowClassFn ? model.rowClassFn(data) : null,
            noRowsOverlayComponentFramework: observer(() => div(model.emptyText)),
            onRowClicked: (e) => {
                this.onRowClicked(e);
                if (props.onRowClicked) props.onRowClicked(e);
            },
            onRowDoubleClicked: props.onRowDoubleClicked,
            onCellClicked: props.onCellClicked,
            onCellDoubleClicked: props.onCellDoubleClicked,
            onRowGroupOpened: this.onRowGroupOpened,
            onSelectionChanged: this.onSelectionChanged,
            onDragStopped: this.onDragStopped,
            onColumnResized: this.onColumnResized,
            onColumnRowGroupChanged: this.onColumnRowGroupChanged,
            onColumnPinned: this.onColumnPinned,
            onColumnVisible: this.onColumnVisible,
            processCellForClipboard: this.processCellForClipboard,
            defaultGroupSortComparator: model.groupSortFn ? this.groupSortComparator : undefined,
            groupDefaultExpanded: 1,
            groupUseEntireRow: true,
            groupRowRendererFramework: model.groupRowElementRenderer,
            groupRowRendererParams: {
                innerRenderer: model.groupRowRenderer,
                suppressCount: !model.showGroupRowCounts
            },
            autoGroupColumnDef: {
                suppressSizeToFit: true // Without this the auto group col will get shrunk when we size to fit
            },
            autoSizePadding: 3 // tighten up cells for ag-Grid native autosizing.  Remove when Hoist autosizing no longer experimental
        };

        // Platform specific defaults
        if (XH.isMobileApp) {
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
        const {model} = this,
            {store, selModel, contextMenu} = model;
        if (!contextMenu || XH.isMobileApp) return null;

        let menu = null;
        if (isFunction(contextMenu)) {
            menu = contextMenu(params, model);
        } else if (isArray(contextMenu) && !isEmpty(contextMenu)) {
            menu = new StoreContextMenu({items: contextMenu, gridModel: model});
        }
        if (!menu) return null;

        const recId = params.node?.id,
            colId = params.column?.colId,
            record = isNil(recId) ? null : store.getById(recId, true),
            column = isNil(colId) ? null : model.getColumn(colId),
            {selection} = model;

        // Adjust selection to target record -- and sync to grid immediately.
        if (record && !(selection.includes(record))) {
            selModel.select(record);
        }

        if (!record) selModel.clear();

        return this.buildMenuItems(menu.items, record, selModel.records, column, params);
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

            items.push({
                name: displaySpec.text,
                shortcut: displaySpec.secondaryText,
                icon,
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
            {agGridModel, store, experimental} = model;

        return {
            track: () => [model.isReady, store._filtered, model.showSummary],
            run: ([isReady, newRs]) => {
                if (!isReady) return;

                const {agApi} = model,
                    prevRs = this._prevRs,
                    prevCount = prevRs ? prevRs.count : 0;

                withShortDebug(`Updating ag-Grid from Store`, () => {
                    let transaction = null;
                    if (prevCount !== 0) {
                        transaction = this.genTransaction(newRs, prevRs);
                        console.debug(this.transactionLogStr(transaction));

                        if (!this.transactionIsEmpty(transaction)) {
                            agApi.applyTransaction(transaction);
                        }

                    } else {
                        agApi.setRowData(newRs.list);
                    }

                    if (experimental.externalSort) {
                        agGridModel.applySortBy(model.sortBy);
                    }

                    this.updatePinnedSummaryRowData();

                    if (transaction?.update) {
                        const refreshCols = model.columns.filter(c => !c.hidden && c.rendererIsComplex);
                        if (refreshCols) {
                            const rowNodes = compact(transaction.update.map(r => agApi.getRowNode(r.id))),
                                columns = refreshCols.map(c => c.colId);
                            agApi.refreshCells({rowNodes, columns, force: true});
                        }
                    }

                    if (!transaction || transaction.add || transaction.remove) {
                        wait(0).then(() => this.syncSelection());
                    }

                    model.noteAgExpandStateChange();
                }, this);

                this._prevRs = newRs;
            }
        };
    }


    selectionReaction() {
        const {model} = this;
        return {
            track: () => [model.isReady, model.selection],
            run: ([isReady]) => {
                if (isReady) this.syncSelection();
            }
        };
    }

    sortReaction() {
        const {model} = this,
            {externalSort} = model.experimental;

        return {
            track: () => [model.agColumnApi, model.sortBy],
            run: ([colApi, sortBy]) => {
                if (colApi && !externalSort) {
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
                    colState.forEach((col, index) => {
                        const agCol = agColState[index],
                            id = col.colId;

                        if (agCol.width != col.width) {
                            colApi.setColumnWidth(id, col.width);
                        }
                        if (agCol.hide != col.hidden) {
                            colApi.setColumnVisible(id, !col.hidden);
                        }
                        if (agCol.pinned != col.pinned) {
                            colApi.setColumnPinned(id, col.pinned);
                        }
                    });
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

    genTransaction(newRs, prevRs) {
        return withShortDebug('Generating Transaction', () => {
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

        }, this);
    }

    syncSelection() {
        const {agGridModel, selModel, isReady} = this.model,
            {ids} = selModel;
        if (isReady && !isEqual(ids, agGridModel.getSelectedRowNodeIds())) {
            agGridModel.setSelectedRowNodeIds(ids);
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
    getDataPath = (data) => {
        return data.treePath;
    };

    onSelectionChanged = () => {
        this.model.noteAgSelectionStateChanged();
    };

    // Catches column re-ordering, resizing AND pinning via user drag-and-drop interaction.
    onDragStopped = (ev) => {
        this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
    };

    // Catches column resizing on call to autoSize API.
    onColumnResized = (ev) => {
        if (isDisplayed(this.viewRef.current) && ev.finished && ev.source === 'autosizeColumns') {
            this.model.noteAgColumnStateChanged(ev.columnApi.getColumnState());
        }
        ev.api.resetRowHeights();
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
        ev.api.resetRowHeights();
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

    onKeyDown = (evt) => {
        const {selModel} = this.model;
        if ((evt.ctrlKey || evt.metaKey) && evt.key == 'a' && selModel.mode === 'multiple') {
            selModel.selectAll();
            return;
        }

        if (this.propsKeyDown) this.propsKeyDown(evt);
    };

    onRowClicked = (evt) => {
        const {selModel} = this.model;
        if (evt.rowPinned) {
            selModel.clear();
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
