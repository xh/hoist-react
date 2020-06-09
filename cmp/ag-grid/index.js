/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {AgGridReact} from '@xh/hoist/dynamics/agGrid';
export {AgGridReact} from '@xh/hoist/dynamics/agGrid';

export * from './AgGridModel';
export * from './AgGrid';
export const agGridReact = elemFactory(AgGridReact);
