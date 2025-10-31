/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {checkVersion, logError} from '@xh/hoist/utils/js';
import {Component} from 'react';

/**
 * The exports below are ag-Grid components provided at runtime by applications.
 *
 * This allows applications to provide Hoist with their duly imported and licensed
 * versions of ag-Grid.  In particular, note that many (but not all) users of Hoist
 * will be expected to have the enterprise version of ag-Grid.
 */
export let AgGridReact = null;
export let agGridVersion = null;

/**
 * However Hoist does import the following community-only TYPES to help validate its internal
 * implementations.
 */
export type {
    GridOptions,
    GridApi,
    SortDirection,
    ColDef,
    ColGroupDef,
    GetContextMenuItemsParams,
    GridReadyEvent,
    IHeaderGroupParams,
    IHeaderParams,
    ProcessCellForExportParams,
    CellClassParams,
    HeaderClassParams,
    HeaderValueGetterParams,
    ICellRendererParams,
    ITooltipParams,
    IRowNode,
    RowClassParams,
    ValueGetterParams,
    ValueSetterParams,
    MenuItemDef,
    CellPosition,
    NavigateToNextCellParams,
    ColumnEvent,
    ColumnState as AgColumnState,
    Column as AgColumn,
    ColumnGroup as AgColumnGroup,
    AgProvidedColumnGroup,
    RowDoubleClickedEvent,
    RowClickedEvent,
    RowHeightParams,
    CellClickedEvent,
    CellContextMenuEvent,
    CellDoubleClickedEvent,
    CellEditingStartedEvent,
    CellEditingStoppedEvent
} from 'ag-grid-community';

export type {CustomCellEditorProps, CustomMenuItemProps} from 'ag-grid-react';
export {useGridCellEditor, useGridMenuItem} from 'ag-grid-react';

const MIN_VERSION = '34.2.0';
const MAX_VERSION = '34.*.*';

/**
 * Expose application versions of ag-Grid to Hoist.
 * Typically called in the Bootstrap.js. of the application.
 */
export function installAgGrid(ComponentReactWrapper: Component, version: string) {
    if (!checkVersion(version, MIN_VERSION, MAX_VERSION)) {
        logError(
            `This version of Hoist requires an ag-Grid version between ${MIN_VERSION} and ` +
                `${MAX_VERSION}. Version ${version} detected. ag-Grid will be unavailable.`
        );
        return;
    }

    AgGridReact = ComponentReactWrapper;
    agGridVersion = version;
}
