/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {installAgGrid} from '@xh/hoist/kit/ag-grid';
import {
    CellStyleModule,
    ClientSideRowModelApiModule,
    ClientSideRowModelModule,
    ColumnApiModule,
    CustomEditorModule,
    ModuleRegistry,
    PinnedRowModule,
    RenderApiModule,
    RowApiModule,
    RowAutoHeightModule,
    RowDragModule,
    RowSelectionModule,
    RowStyleModule,
    ScrollApiModule,
    TextEditorModule,
    TextFilterModule,
    TooltipModule
} from 'ag-grid-community';
import {AgGridReact} from 'ag-grid-react';

let installed = false;

/**
 * Install ag-Grid for component tests that render a `Grid`, `DataView` or `AgGrid`, so that a
 * test can see what Hoist hands to ag-Grid and what ag-Grid renders from it. Call in `beforeAll`,
 * after `initTestAppAsync()`.
 *
 * Registers the community modules every Hoist app registers (see Toolbox's `Bootstrap.ts`) and
 * provides `AgGridReact` to Hoist, as an app's bootstrap does. Enterprise features - grouping,
 * tree data, menus, clipboard - need `ag-grid-enterprise`, which hoist-react does not depend on.
 * A spec that needs them registers those modules itself.
 *
 * ag-Grid renders its header, rows and cells in jsdom, which has no layout. Every row and column
 * renders regardless of the viewport, so virtualisation cannot be observed here, and measured
 * sizes read back as zero. Inline styles and CSS variables can be read as set.
 */
export function installAgGridForTests() {
    if (installed) return;
    ModuleRegistry.registerModules([
        CellStyleModule,
        ClientSideRowModelApiModule,
        ClientSideRowModelModule,
        ColumnApiModule,
        CustomEditorModule,
        PinnedRowModule,
        RenderApiModule,
        RowApiModule,
        RowAutoHeightModule,
        RowDragModule,
        RowSelectionModule,
        RowStyleModule,
        ScrollApiModule,
        TextEditorModule,
        TextFilterModule,
        TooltipModule
    ]);
    installAgGrid(AgGridReact as any, ClientSideRowModelModule.version);
    installed = true;
}
