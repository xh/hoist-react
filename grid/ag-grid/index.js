/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'ag-grid-enterprise';
import {AgGridReact} from 'ag-grid-react';
import {LicenseManager} from 'ag-grid-enterprise';
import {elemFactory} from 'hoist/core';
import 'ag-grid/dist/styles/ag-grid.css';

// TODO - determine if we can avoid importing both of these, and/or use a SASS import
import 'ag-grid/dist/styles/ag-theme-balham.css';
import 'ag-grid/dist/styles/ag-theme-balham-dark.css';

import './styles.scss';

LicenseManager.setLicenseKey(
    'Extremely_Heavy_Industries_Scout_3Devs9_March_2019__MTU1MjA4OTYwMDAwMA==79f1a93b578543bf1e45a51272b2359a'
);

export * from './NavigateSelection';
export const agGridReact = elemFactory(AgGridReact);