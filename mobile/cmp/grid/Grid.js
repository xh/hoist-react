/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {find, isEqual, merge, cloneDeep} from 'lodash';
import {observable, runInAction} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent, LayoutSupport, XH} from '@xh/hoist/core';
import {box, fragment} from '@xh/hoist/cmp/layout';
import './ag-grid';
import {agGridReact} from './ag-grid';

/**
 * The primary rich data grid component within the Hoist mobile toolkit.
 * It is a highly managed wrapper around ag-Grid and is the main display component for GridModel.
 *
 * Applications should typically configure and interact with Grids via a GridModel, which provides
 * support for specifying the Grid's data Store, Column definitions, sorting state, and more.
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
         * Options for AG Grid's API.
         *
         * This constitutes an 'escape hatch' for applications that need to get to the underlying
         * ag-Grid API. It should be used with care. Settings made here might be overwritten and/or
         * interfere with the implementation of this component and its use of the ag-Grid API.
         */
        agOptions: PT.object,

        /**
         * Callback to call when a row is tapped.  Function will receive an event
         * with a data node containing the row's data.
         * @see {@link https://www.ag-grid.com/javascript-grid-events/#properties-and-hierarchy|ag-Grid Event Docs}
         */
        onRowClicked: PT.func
    };

    static ROW_HEIGHT = 28;
    static COMPACT_ROW_HEIGHT = 24;

    baseClassName = 'xh-grid';

    constructor(props) {
        super(props);
        this.addReaction(this.sortReaction());
        this.addReaction(this.columnsReaction());
        this.addReaction(this.dataReaction());
        this.addReaction(this.compactReaction());
    }

    render() {
        const {compact} = this.model,
            {agOptions} = this.props,
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
                    compact ? 'xh-grid-compact' : 'xh-grid-standard'
                )
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
            allowContextMenuWithControlKey: false,
            defaultColDef: {suppressMenu: true},
            rowSelection: 'single',
            getRowHeight: () => model.compact ? Grid.COMPACT_ROW_HEIGHT : Grid.ROW_HEIGHT,
            getRowClass: ({data}) => model.rowClassFn ? model.rowClassFn(data) : null,
            overlayNoRowsTemplate: model.emptyText || '<span></span>',
            onRowClicked: props.onRowClicked,
            onGridReady: this.onGridReady,
            onSelectionChanged: this.onSelectionChanged,
            onSortChanged: this.onSortChanged,
            onGridSizeChanged: this.onGridSizeChanged
        };
    }

    //------------------------
    // Support for defaults
    //------------------------
    getColumnDefs() {
        const {columns, sortBy} = this.model,
            clonedColumns = cloneDeep(columns),
            cols = clonedColumns.map(c => c.getAgSpec());

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
                    });
                }
            }
        };
    }

    sortReaction() {
        return {
            track: () => [this.model.agApi, this.model.sortBy],
            run: ([api, sortBy]) => {
                if (api && !isEqual(api.getSortModel(), sortBy)) {
                    api.setSortModel(sortBy);
                }
            }
        };
    }

    columnsReaction() {
        return {
            track: () => [this.model.agApi, this.model.columns],
            run: ([api]) => {
                if (api) {
                    api.setColumnDefs(this.getColumnDefs());
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
    onGridReady = (ev) => {
        this.model.setAgApi(ev.api);
    }

    onSelectionChanged = (ev) => {
        // We use selection to show a 'tapped' effect on the row
        if (this._tapHighlightTimeout) clearTimeout(this._tapHighlightTimeout);
        this._tapHighlightTimeout = setTimeout(() => {
            ev.api.deselectAll();
        }, 100);
    }

    onSortChanged = (ev) => {
        this.model.setSortBy(ev.api.getSortModel());
    }

    onGridSizeChanged = (ev) => {
        if (this.isDisplayed) {
            ev.api.sizeColumnsToFit();
        }
    }

}

export const grid = elemFactory(Grid);