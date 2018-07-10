/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {fileColFactory} from './Utils.js';
import {dateRenderer, dateTimeRenderer, timeRenderer, compactDateRenderer} from '../format';
import {exportFormats} from '@xh/hoist/utils/ExportUtils';

const colFactory = fileColFactory({
    cellStyle: {align: 'right'}
});

export const dateCol = colFactory({
    headerName: 'Date',
    valueFormatter: dateRenderer(),
    exportFormat: exportFormats.DATE_FMT,
    width: 120
});

export const timeCol = colFactory({
    headerName: 'Time',
    valueFormatter: timeRenderer(),
    width: 90
});

export const dateTimeCol = colFactory({
    headerName: 'Date',
    valueFormatter: dateTimeRenderer(),
    exportFormat: exportFormats.DATETIME_FMT,
    width: 160
});

export const compactDateCol = colFactory({
    headerName: 'Date',
    valueFormatter: compactDateRenderer(),
    exportFormat: exportFormats.DATE_FMT,
    width: 100
});