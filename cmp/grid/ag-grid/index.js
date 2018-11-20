/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'ag-grid-enterprise';
import {AgGridReact} from 'ag-grid-react';
import {LicenseManager} from 'ag-grid-enterprise';
import {elemFactory} from '@xh/hoist/core';
import 'ag-grid-community/dist/styles/ag-grid.css';

// TODO - determine if we can avoid importing both of these, and/or use a SASS import
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import 'ag-grid-community/dist/styles/ag-theme-balham-dark.css';

import './styles.scss';

// Set via webpack.DefinePlugin at build time - see @xh/hoist-dev-utils/configureWebpack
LicenseManager.setLicenseKey(xhAgGridLicenseKey);

export * from './ColumnHeader';
export * from './NavigateSelection';
export const agGridReact = elemFactory(AgGridReact);