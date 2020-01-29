/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import '@ag-grid-enterprise/all-modules';
import {AgGridReact} from '@ag-grid-community/react';
import {LicenseManager} from '@ag-grid-enterprise/all-modules';
import {elemFactory} from '@xh/hoist/core';
import '@ag-grid-community/all-modules/dist/styles/ag-grid.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-balham.css';
import '@ag-grid-community/all-modules/dist/styles/ag-theme-balham-dark.css';

// Set via webpack.DefinePlugin at build time - see @xh/hoist-dev-utils/configureWebpack
LicenseManager.setLicenseKey(xhAgGridLicenseKey);

import {ModuleRegistry, AllModules} from '@ag-grid-enterprise/all-modules';
ModuleRegistry.registerModules(AllModules);

export * from './AgGridModel';
export * from './AgGrid';
export const agGridReact = elemFactory(AgGridReact);