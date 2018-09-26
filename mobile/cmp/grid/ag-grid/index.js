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
import 'ag-grid/dist/styles/ag-grid.css';
import 'ag-grid/dist/styles/ag-theme-balham.css';
import 'ag-grid/dist/styles/ag-theme-balham-dark.css';

import './styles.scss';

// Set via webpack.DefinePlugin at build time - see @xh/hoist-dev-utils/configureWebpack
LicenseManager.setLicenseKey(xhAgGridLicenseKey);

export const agGridReact = elemFactory(AgGridReact);