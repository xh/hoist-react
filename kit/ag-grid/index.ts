/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import {checkVersion} from '@xh/hoist/utils/js/VersionUtils';

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
    ColumnApi,
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
    Column as AgColumn,
    ColumnGroup as AgColumnGroup
} from '@ag-grid-community/core';

const MIN_VERSION = '29.1.0';
const MAX_VERSION = '29.*.*';

/**
 * Expose application versions of ag-Grid to Hoist.
 * Typically called in the Bootstrap.js. of the application.
 */
export function installAgGrid(ComponentReactWrapper, version: string) {
    if (!checkVersion(version, MIN_VERSION, MAX_VERSION)) {
        console.error(
            `This version of Hoist requires an ag-Grid version between ${MIN_VERSION} and ` +
                `${MAX_VERSION}. Version ${version} detected. ag-Grid will be unavailable.`
        );
        return;
    }

    AgGridReact = ComponentReactWrapper;
    agGridVersion = version;
}
